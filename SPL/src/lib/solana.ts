import { Connection, PublicKey, SystemProgram, Transaction, clusterApiUrl, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  AuthorityType,
  MINT_SIZE,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  createSetAuthorityInstruction
} from '@solana/spl-token';
import {
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
  createCreateMetadataAccountV3Instruction,
  createUpdateMetadataAccountV2Instruction
} from '@metaplex-foundation/mpl-token-metadata';
import { Web3Storage } from 'web3.storage';

// Network/Connection
const NETWORK = (import.meta as any).env?.VITE_SOLANA_NETWORK || 'devnet';
const RPC_URL = (import.meta as any).env?.VITE_SOLANA_RPC_URL || clusterApiUrl(NETWORK as any);
export const connection = new Connection(RPC_URL, 'confirmed');

// Types
export interface CreateTokenParams {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: number;
  description?: string;
  imageFile: File;
  website?: string;
  twitter?: string;
  telegram?: string;
  wallet: any; // wallet-adapter wallet
  revokeFreezeAuthority?: boolean;
  revokeMintAuthority?: boolean;
  revokeUpdateAuthority?: boolean;
}

export interface CreateTokenResult {
  mint: PublicKey;
  tokenAccount: PublicKey;
  signature: string;
  metadataSignature?: string;
}

/**
 * Get explorer URL for transaction or account
 */
export function getExplorerUrl(signature: string, type: 'tx' | 'account' = 'tx'): string {
  const baseUrl = 'https://explorer.solana.com';
  const cluster = NETWORK === 'mainnet-beta' ? '' : '?cluster=devnet';
  
  if (type === 'tx') {
    return `${baseUrl}/tx/${signature}${cluster}`;
  } else {
    return `${baseUrl}/address/${signature}${cluster}`;
  }
}

/**
 * Format token amount with proper decimals
 */
export function formatTokenAmount(amount: number, decimals: number): string {
  return (amount / Math.pow(10, decimals)).toLocaleString();
}

/**
 * Validate Solana address
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get wallet balance
 */
export async function getWalletBalance(publicKey: PublicKey): Promise<number> {
  try {
    const balance = await connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Failed to get wallet balance:', error);
    return 0;
  }
}

/**
 * Send SOL fee to a recipient address
 */
export async function sendSolFee(wallet: any, toAddress: string, amountSol: number): Promise<string> {
  if (!wallet?.publicKey || !wallet?.signTransaction) {
    throw new Error('Wallet not connected or does not support signing');
  }

  const toPubkey = new PublicKey(toAddress);
  const owner: PublicKey = wallet.publicKey;
  const lamports = Math.round(amountSol * LAMPORTS_PER_SOL);

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: owner,
      toPubkey,
      lamports,
    })
  );

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = owner;

  const signedTx = await wallet.signTransaction(tx);
  const signature = await connection.sendRawTransaction(signedTx.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });

  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

  return signature;
}

// --------- IPFS (Web3.Storage) helpers ---------
function getWeb3StorageClient(): Web3Storage {
  const token = (import.meta as any).env?.VITE_WEB3_STORAGE_TOKEN;
  if (!token) throw new Error('Missing VITE_WEB3_STORAGE_TOKEN');
  return new Web3Storage({ token });
}

async function uploadLogoAndMetadataToIpfs(input: {
  name: string;
  symbol: string;
  description?: string;
  imageFile: File;
  website?: string;
  twitter?: string;
  telegram?: string;
}): Promise<{ imageUri: string; metadataUri: string }> {
  const client = getWeb3StorageClient();

  // Upload image
  const imageCid = await client.put([new File([await input.imageFile.arrayBuffer()], input.imageFile.name, { type: input.imageFile.type })], {
    wrapWithDirectory: false
  });
  const imageUri = `https://${imageCid}.ipfs.w3s.link`;

  // Build metadata JSON
  const metadata = {
    name: input.name,
    symbol: input.symbol,
    description: input.description || `${input.name} (${input.symbol})`,
    image: imageUri,
    attributes: [],
    properties: {
      category: 'image',
      files: [{ uri: imageUri, type: input.imageFile.type || 'image/png' }]
    },
    external_url: input.website || undefined,
    extensions: {
      twitter: input.twitter || undefined,
      telegram: input.telegram || undefined
    }
  } as any;

  const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
  const metadataFile = new File([metadataBlob], 'metadata.json', { type: 'application/json' });
  const metadataCid = await client.put([metadataFile], { wrapWithDirectory: false });
  const metadataUri = `https://${metadataCid}.ipfs.w3s.link`;

  return { imageUri, metadataUri };
}

// --------- Metaplex Metadata PDA helper ---------
function getMetadataPda(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    TOKEN_METADATA_PROGRAM_ID
  );
  return pda;
}

// --------- Main createToken flow ---------
export async function createToken(params: CreateTokenParams): Promise<CreateTokenResult> {
  const { wallet } = params;
  if (!wallet?.publicKey || !wallet?.signTransaction) throw new Error('Wallet not connected');

  const payer: PublicKey = wallet.publicKey;

  // 1) Create mint account and initialize
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;

  const rent = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);
  const createMintAccountIx = SystemProgram.createAccount({
    fromPubkey: payer,
    newAccountPubkey: mint,
    lamports: rent,
    space: MINT_SIZE,
    programId: TOKEN_PROGRAM_ID
  });

  const initMintIx = createInitializeMint2Instruction(
    mint,
    params.decimals,
    payer,
    params.revokeFreezeAuthority ? null : payer,
    TOKEN_PROGRAM_ID
  );

  // 2) Create ATA and mint initial supply
  const ata = await getAssociatedTokenAddress(mint, payer);
  const createAtaIx = createAssociatedTokenAccountInstruction(
    payer,
    ata,
    payer,
    mint
  );

  const amount = BigInt(params.initialSupply) * BigInt(Math.pow(10, params.decimals));
  const mintToIx = createMintToInstruction(
    mint,
    ata,
    payer,
    Number(amount)
  );

  const txMint = new Transaction().add(createMintAccountIx, initMintIx, createAtaIx, mintToIx);
  txMint.feePayer = payer;
  const { blockhash: bh0, lastValidBlockHeight: lbh0 } = await connection.getLatestBlockhash('confirmed');
  txMint.recentBlockhash = bh0;
  txMint.partialSign(mintKeypair);
  const signedMintTx = await wallet.signTransaction(txMint);
  const mintSignature = await connection.sendRawTransaction(signedMintTx.serialize());
  await connection.confirmTransaction({ signature: mintSignature, blockhash: bh0, lastValidBlockHeight: lbh0 }, 'confirmed');

  // 3) Upload image + metadata to IPFS and create Metaplex metadata account
  const { metadataUri } = await uploadLogoAndMetadataToIpfs({
    name: params.name,
    symbol: params.symbol,
    description: params.description,
    imageFile: params.imageFile,
    website: params.website,
    twitter: params.twitter,
    telegram: params.telegram
  });

  const metadataPda = getMetadataPda(mint);
  const metadataIx = createCreateMetadataAccountV3Instruction(
    {
      metadata: metadataPda,
      mint,
      mintAuthority: payer,
      payer,
      updateAuthority: payer
    },
    {
      createMetadataAccountArgsV3: {
        data: {
          name: params.name,
          symbol: params.symbol,
          uri: metadataUri,
          sellerFeeBasisPoints: 0,
          creators: null,
          collection: null,
          uses: null
        },
        isMutable: !params.revokeUpdateAuthority,
        collectionDetails: null
      }
    }
  );

  const tx1 = new Transaction().add(metadataIx);
  tx1.feePayer = payer;
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  tx1.recentBlockhash = blockhash;
  const signed1 = await wallet.signTransaction(tx1);
  const metadataSignature = await connection.sendRawTransaction(signed1.serialize());
  await connection.confirmTransaction({ signature: metadataSignature, blockhash, lastValidBlockHeight }, 'confirmed');

  // 4) Revoke authorities as requested
  const revokeTx = new Transaction();

  if (params.revokeMintAuthority) {
    revokeTx.add(
      createSetAuthorityInstruction(
        mint,
        payer,
        AuthorityType.MintTokens,
        null
      )
    );
  }

  if (params.revokeFreezeAuthority) {
    revokeTx.add(
      createSetAuthorityInstruction(
        mint,
        payer,
        AuthorityType.FreezeAccount,
        null
      )
    );
  }

  if (params.revokeUpdateAuthority) {
    const updateIx = createUpdateMetadataAccountV2Instruction(
      {
        metadata: metadataPda,
        updateAuthority: payer
      },
      {
        updateMetadataAccountArgsV2: {
          data: null,
          updateAuthority: null,
          primarySaleHappened: null,
          isMutable: false
        }
      }
    );
    revokeTx.add(updateIx);
  }

  let signature = metadataSignature;
  if (revokeTx.instructions.length > 0) {
    revokeTx.feePayer = payer;
    const { blockhash: b2, lastValidBlockHeight: l2 } = await connection.getLatestBlockhash('confirmed');
    revokeTx.recentBlockhash = b2;
    const signed2 = await wallet.signTransaction(revokeTx);
    signature = await connection.sendRawTransaction(signed2.serialize());
    await connection.confirmTransaction({ signature, blockhash: b2, lastValidBlockHeight: l2 }, 'confirmed');
  }

  return {
    mint,
    tokenAccount: ata,
    signature,
    metadataSignature
  };
}