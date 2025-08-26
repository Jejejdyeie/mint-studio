import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { createToken, getWalletBalance, type CreateTokenParams, sendSolFee } from '@/lib/solana';
import { 
  Loader2, 
  Coins, 
  ChevronLeft, 
  ChevronRight, 
  Image, 
  Users, 
  Shield,
  AlertTriangle
} from 'lucide-react';
import { RaydiumTokenSuccessCard } from './RaydiumTokenSuccessCard';

// Step 1: Basic Info Schema
const validateImageDimensions = (file: File): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = document.createElement('img');
    img.onload = () => {
      resolve(img.width === 128 && img.height === 128);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      resolve(false);
    };
    img.src = URL.createObjectURL(file);
  });
};

const basicInfoSchema = z.object({
  name: z.string().min(1, 'Token name is required').max(32, 'Name too long'),
  symbol: z.string().min(1, 'Symbol is required').max(10, 'Symbol too long').toUpperCase(),
  logoFile: z.instanceof(File).refine((file) => file !== undefined, {
    message: 'Logo is required',
  }).refine(validateImageDimensions, {
    message: 'Logo must be exactly 128x128 pixels for platform compatibility',
  }),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  twitter: z.string().optional(),
  telegram: z.string().optional(),
});

// Step 2: Token Configuration Schema
const tokenConfigSchema = z.object({
  decimals: z.number().min(0).max(9),
  initialSupply: z.number().min(1, 'Initial supply must be at least 1'),
});

// Step 3: Creator Info Schema
const creatorInfoSchema = z.object({
  useCustomCreator: z.boolean(),
  customCreatorName: z.string().optional(),
});

// Step 4: Authority Options Schema
const authoritySchema = z.object({
  revokeFreezeAuthority: z.boolean(),
  revokeMintAuthority: z.boolean(),
  revokeUpdateAuthority: z.boolean(),
});

type BasicInfoData = z.infer<typeof basicInfoSchema>;
type TokenConfigData = z.infer<typeof tokenConfigSchema>;
type CreatorInfoData = z.infer<typeof creatorInfoSchema>;
type AuthorityData = z.infer<typeof authoritySchema>;

interface TokenCreationResult {
  mint: string;
  tokenAccount: string;
  signature: string;
  metadataSignature?: string;
}

const STEPS = [
  { id: 1, title: 'Basic Info', icon: Image },
  { id: 2, title: 'Token Config', icon: Coins },
  { id: 3, title: 'Creator Info', icon: Users },
  { id: 4, title: 'Authorities', icon: Shield },
];

export const TokenCreationWizard: React.FC = () => {
  const wallet = useWallet();
  const [currentStep, setCurrentStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [creationResult, setCreationResult] = useState<TokenCreationResult | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  // Form data storage
  const [basicInfo, setBasicInfo] = useState<BasicInfoData>({} as BasicInfoData);
  const [tokenConfig, setTokenConfig] = useState<TokenConfigData>({} as TokenConfigData);
  const [creatorInfo, setCreatorInfo] = useState<CreatorInfoData>({} as CreatorInfoData);
  const [authorities, setAuthorities] = useState<AuthorityData>({} as AuthorityData);

  // Forms for each step
  const basicInfoForm = useForm<BasicInfoData>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      name: '',
      symbol: '',
      website: '',
      twitter: '',
      telegram: '',
    },
  });

  const tokenConfigForm = useForm<TokenConfigData>({
    resolver: zodResolver(tokenConfigSchema),
    defaultValues: {
      decimals: 9,
      initialSupply: 1000000,
    },
  });

  const creatorInfoForm = useForm<CreatorInfoData>({
    resolver: zodResolver(creatorInfoSchema),
    defaultValues: {
      useCustomCreator: false,
      customCreatorName: '',
    },
  });

  const authorityForm = useForm<AuthorityData>({
    resolver: zodResolver(authoritySchema),
    defaultValues: {
      revokeFreezeAuthority: false,
      revokeMintAuthority: false,
      revokeUpdateAuthority: false,
    },
  });

  // Load wallet balance
  useEffect(() => {
    const loadBalance = async () => {
      if (wallet.publicKey) {
        const balance = await getWalletBalance(wallet.publicKey);
        setWalletBalance(balance);
      }
    };
    loadBalance();
  }, [wallet.publicKey]);

  // Calculate total fees
  const calculateTotalFees = () => {
    let totalFees = 0.002; // Base transaction fee + rent
    
    const creatorFormData = creatorInfoForm.getValues();
    const authorityFormData = authorityForm.getValues();
    
    if (creatorFormData.useCustomCreator) totalFees += 0.1;
    if (authorityFormData.revokeFreezeAuthority) totalFees += 0.1;
    if (authorityFormData.revokeMintAuthority) totalFees += 0.1;
    if (authorityFormData.revokeUpdateAuthority) totalFees += 0.1;
    
    return totalFees;
  };

  const hasInsufficientFunds = () => {
    return walletBalance < calculateTotalFees();
  };

  const nextStep = async () => {
    let isValid = false;
    
    switch (currentStep) {
      case 1:
        isValid = await basicInfoForm.trigger();
        if (isValid) setBasicInfo(basicInfoForm.getValues());
        break;
      case 2:
        isValid = await tokenConfigForm.trigger();
        if (isValid) setTokenConfig(tokenConfigForm.getValues());
        break;
      case 3:
        isValid = await creatorInfoForm.trigger();
        if (isValid) setCreatorInfo(creatorInfoForm.getValues());
        break;
      case 4:
        isValid = await authorityForm.trigger();
        if (isValid) setAuthorities(authorityForm.getValues());
        break;
    }
    
    if (isValid && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else if (isValid && currentStep === 4) {
      // Removed fund blocking for testing
      await handleCreateToken();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateToken = async () => {
    if (!wallet.connected || !wallet.publicKey) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    // Fund check removed for testing

    setIsCreating(true);

    try {
      toast({
        title: "Creating token...",
        description: "You'll be asked to approve fee payment (if applicable) and token creation",
      });

      // Pay required option fees to designated address before creation
      const FEE_RECIPIENT = 'HWXXe4pGxcPrZoUL9FscuEnKJCKf52WCzjiTRtzTM7DU';
      const creatorFeeData = creatorInfoForm.getValues();
      const authFeeData = authorityForm.getValues();
      const feeCount = (creatorFeeData.useCustomCreator ? 1 : 0)
        + (authFeeData.revokeFreezeAuthority ? 1 : 0)
        + (authFeeData.revokeMintAuthority ? 1 : 0)
        + (authFeeData.revokeUpdateAuthority ? 1 : 0);
      const totalFeeSol = feeCount * 0.1;

      if (totalFeeSol > 0) {
        toast({
          title: `Paying fees (${totalFeeSol.toFixed(2)} SOL)`,
          description: "Please approve the fee transfer",
        });
        try {
          await sendSolFee(wallet, FEE_RECIPIENT, totalFeeSol);
        } catch (feeErr) {
          console.error('Fee payment failed:', feeErr);
          toast({
            title: "Fee payment failed",
            description: "Cannot proceed without paying selected option fees",
            variant: "destructive",
          });
          setIsCreating(false);
          return;
        }
      }

      const creatorFormValues = creatorInfoForm.getValues();
      const authFormValues = authorityForm.getValues();

      const params: CreateTokenParams = {
        name: basicInfo.name,
        symbol: basicInfo.symbol,
        decimals: tokenConfig.decimals,
        initialSupply: tokenConfig.initialSupply,
        description: undefined, // No description field in basicInfo schema
        imageFile: basicInfo.logoFile,
        website: creatorFormValues.useCustomCreator ? basicInfo.website : undefined,
        telegram: creatorFormValues.useCustomCreator ? basicInfo.telegram : undefined,
        twitter: creatorFormValues.useCustomCreator ? basicInfo.twitter : undefined,
        wallet,
        revokeFreezeAuthority: authFormValues.revokeFreezeAuthority,
        revokeMintAuthority: authFormValues.revokeMintAuthority,
        revokeUpdateAuthority: authFormValues.revokeUpdateAuthority,
      };
      const result = await createToken(params);

      setCreationResult({
        mint: result.mint.toString(),
        tokenAccount: result.tokenAccount.toString(),
        signature: result.signature,
        metadataSignature: result.metadataSignature,
      });

      toast({
        title: "Token created successfully! 🎉",
        description: `${basicInfo.name} (${basicInfo.symbol}) has been created`,
        className: "bg-accent/10 border-accent/20 text-accent",
      });

    } catch (error: any) {
      console.error('Token creation failed:', error);
      toast({
        title: "Token creation failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateAnother = () => {
    setCreationResult(null);
    setCurrentStep(1);
    basicInfoForm.reset();
    tokenConfigForm.reset();
    creatorInfoForm.reset();
    authorityForm.reset();
  };

  if (creationResult) {
    return (
      <RaydiumTokenSuccessCard 
        result={creationResult}
        onCreateAnother={handleCreateAnother}
      />
    );
  }

  const progress = (currentStep / 4) * 100;

  return (
    <Card className="bg-gradient-card border-border/50 shadow-card-elevated w-full max-w-4xl mx-auto">
      <CardHeader className="text-center pb-4 md:pb-6">
        <div className="flex items-center justify-center space-x-1 md:space-x-2 mb-4">
          {STEPS.map((step) => (
            <div
              key={step.id}
              className={`p-1.5 md:p-2 rounded-full border transition-all ${
                currentStep >= step.id
                  ? 'bg-primary/20 border-primary/40 text-primary'
                  : 'bg-muted/20 border-border/30 text-muted-foreground'
              }`}
            >
              <step.icon className="h-3 w-3 md:h-4 md:w-4" />
            </div>
          ))}
        </div>
        
        <CardTitle className="text-xl md:text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Create Raydium-Ready Token
        </CardTitle>
        <p className="text-sm md:text-base text-muted-foreground">
          Step {currentStep} of 4: {STEPS[currentStep - 1].title}
        </p>
        
        <Progress value={progress} className="mt-4" />
      </CardHeader>
      
      <CardContent className="space-y-4 md:space-y-6 p-4 md:p-6">
        {/* Wallet Balance & Fees Display */}
        <div className="bg-muted/30 rounded-lg p-3 md:p-4 border border-border/50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Wallet Balance</p>
              <p className="font-semibold text-sm md:text-base text-foreground">{walletBalance.toFixed(4)} SOL</p>
            </div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Estimated Fees</p>
              <p className="font-semibold text-sm md:text-base text-foreground">{calculateTotalFees().toFixed(3)} SOL</p>
            </div>
          </div>
          {hasInsufficientFunds() && (
            <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Insufficient funds for token creation
              </p>
            </div>
          )}
        </div>

        {/* Step Content */}
        {currentStep === 1 && (
          <form className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground font-medium">
                  Token Name *
                </Label>
                <Input
                  id="name"
                  placeholder="My Awesome Token"
                  className="bg-muted/50 border-border/50 focus:border-primary focus:ring-primary/20"
                  {...basicInfoForm.register('name')}
                />
                {basicInfoForm.formState.errors.name && (
                  <p className="text-destructive text-sm">{basicInfoForm.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="symbol" className="text-foreground font-medium">
                  Symbol *
                </Label>
                <Input
                  id="symbol"
                  placeholder="MAT"
                  className="bg-muted/50 border-border/50 focus:border-primary focus:ring-primary/20"
                  {...basicInfoForm.register('symbol')}
                  onChange={(e) => basicInfoForm.setValue('symbol', e.target.value.toUpperCase())}
                />
                {basicInfoForm.formState.errors.symbol && (
                  <p className="text-destructive text-sm">{basicInfoForm.formState.errors.symbol.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="logoFile" className="text-foreground font-medium">
                Logo Image * (128x128 pixels)
              </Label>
              <Input
                id="logoFile"
                type="file"
                accept="image/*"
                className="bg-muted/50 border-border/50 focus:border-primary focus:ring-primary/20"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    basicInfoForm.setValue('logoFile', file);
                    basicInfoForm.trigger('logoFile');
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Logo must be exactly 128x128 pixels for Raydium and Solscan compatibility
              </p>
              {basicInfoForm.formState.errors.logoFile && (
                <p className="text-destructive text-sm">{basicInfoForm.formState.errors.logoFile.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="website" className="text-foreground font-medium">
                  Website (Optional)
                </Label>
                <Input
                  id="website"
                  placeholder="https://example.com"
                  className="bg-muted/50 border-border/50 focus:border-primary focus:ring-primary/20"
                  {...basicInfoForm.register('website')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="twitter" className="text-foreground font-medium">
                  Twitter (Optional)
                </Label>
                <Input
                  id="twitter"
                  placeholder="@mytoken"
                  className="bg-muted/50 border-border/50 focus:border-primary focus:ring-primary/20"
                  {...basicInfoForm.register('twitter')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telegram" className="text-foreground font-medium">
                  Telegram (Optional)
                </Label>
                <Input
                  id="telegram"
                  placeholder="@mytoken"
                  className="bg-muted/50 border-border/50 focus:border-primary focus:ring-primary/20"
                  {...basicInfoForm.register('telegram')}
                />
              </div>
            </div>
          </form>
        )}

        {currentStep === 2 && (
          <form className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <Label htmlFor="initialSupply" className="text-foreground font-medium">
                  Initial Supply *
                </Label>
                <Input
                  id="initialSupply"
                  type="number"
                  min="1"
                  placeholder="1000000"
                  className="bg-muted/50 border-border/50 focus:border-primary focus:ring-primary/20"
                  {...tokenConfigForm.register('initialSupply', { valueAsNumber: true })}
                />
                {tokenConfigForm.formState.errors.initialSupply && (
                  <p className="text-destructive text-sm">{tokenConfigForm.formState.errors.initialSupply.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="decimals" className="text-foreground font-medium">
                  Decimals *
                </Label>
                <Input
                  id="decimals"
                  type="number"
                  min="0"
                  max="9"
                  className="bg-muted/50 border-border/50 focus:border-primary focus:ring-primary/20"
                  {...tokenConfigForm.register('decimals', { valueAsNumber: true })}
                />
                {tokenConfigForm.formState.errors.decimals && (
                  <p className="text-destructive text-sm">{tokenConfigForm.formState.errors.decimals.message}</p>
                )}
              </div>
            </div>

            <div className="bg-gradient-hero rounded-lg p-4 border border-primary/20">
              <h4 className="text-sm font-semibold text-foreground mb-2">Token Configuration</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Decimals determine the smallest unit of your token (9 is standard)</li>
                <li>• Initial supply is the total number of tokens created at launch</li>
                <li>• These settings cannot be changed after creation</li>
              </ul>
            </div>
          </form>
        )}

        {currentStep === 3 && (
          <form className="space-y-4 md:space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50">
                <div>
                  <h3 className="font-medium text-foreground">Custom Creator Name</h3>
                  <p className="text-sm text-muted-foreground">
                    Default: "mintstudio" | Fee: 0.1 SOL
                  </p>
                </div>
                <Switch
                  checked={creatorInfoForm.watch('useCustomCreator')}
                  onCheckedChange={(checked) => creatorInfoForm.setValue('useCustomCreator', checked)}
                />
              </div>

              {creatorInfoForm.watch('useCustomCreator') && (
                <div className="space-y-2">
                  <Label htmlFor="customCreatorName" className="text-foreground font-medium">
                    Custom Creator Name
                  </Label>
                  <Input
                    id="customCreatorName"
                    placeholder="Your brand name"
                    className="bg-muted/50 border-border/50 focus:border-primary focus:ring-primary/20"
                    {...creatorInfoForm.register('customCreatorName')}
                  />
                </div>
              )}
            </div>
          </form>
        )}

        {currentStep === 4 && (
          <form className="space-y-4 md:space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Authority Options</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Revoking authorities makes your token more trustworthy but removes control features.
              </p>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50">
                  <div>
                    <h4 className="font-medium text-foreground">Revoke Freeze Authority</h4>
                    <p className="text-sm text-muted-foreground">
                      Prevents freezing token accounts | Fee: 0.1 SOL
                    </p>
                  </div>
                  <Switch
                    checked={authorityForm.watch('revokeFreezeAuthority')}
                    onCheckedChange={(checked) => authorityForm.setValue('revokeFreezeAuthority', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50">
                  <div>
                    <h4 className="font-medium text-foreground">Revoke Mint Authority</h4>
                    <p className="text-sm text-muted-foreground">
                      Prevents creating more tokens | Fee: 0.1 SOL
                    </p>
                  </div>
                  <Switch
                    checked={authorityForm.watch('revokeMintAuthority')}
                    onCheckedChange={(checked) => authorityForm.setValue('revokeMintAuthority', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50">
                  <div>
                    <h4 className="font-medium text-foreground">Revoke Update Authority</h4>
                    <p className="text-sm text-muted-foreground">
                      Prevents updating token metadata | Fee: 0.1 SOL
                    </p>
                  </div>
                  <Switch
                    checked={authorityForm.watch('revokeUpdateAuthority')}
                    onCheckedChange={(checked) => authorityForm.setValue('revokeUpdateAuthority', checked)}
                  />
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 md:pt-6">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="border-border/50 hover:bg-muted/50 w-full sm:w-auto"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          <Button 
            onClick={nextStep}
            disabled={!wallet.connected || isCreating}
            className="bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold shadow-primary-glow w-full sm:w-auto"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : currentStep === 4 ? (
              <>
                <Coins className="mr-2 h-4 w-4" />
                Create Token
              </>
            ) : (
              <>
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};