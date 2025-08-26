import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getWalletBalance } from '@/lib/solana';
import { Wallet, Activity } from 'lucide-react';

export const WalletConnect: React.FC = () => {
  const { publicKey, connected } = useWallet();
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (connected && publicKey) {
      setLoading(true);
      getWalletBalance(publicKey)
        .then(setBalance)
        .finally(() => setLoading(false));
    }
  }, [connected, publicKey]);

  if (!connected) {
    return (
      <Card className="bg-gradient-card border-border/50 shadow-card-elevated">
        <CardContent className="p-6 text-center space-y-4">
          <div className="flex flex-col items-center space-y-3">
            <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Connect Your Wallet
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Connect your Phantom or Solflare wallet to start creating SPL tokens
              </p>
            </div>
          </div>
          <WalletMultiButton className="!bg-primary hover:!bg-primary/90 !text-primary-foreground !border-none !rounded-lg !font-medium !transition-all !duration-300 !shadow-primary-glow" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-border/50 shadow-card-elevated">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-full bg-accent/10 border border-accent/20">
              <Activity className="h-5 w-5 text-accent" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-foreground">
                  {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-8)}
                </span>
                <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">
                  Connected
                </Badge>
              </div>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs text-muted-foreground">Balance:</span>
                {loading ? (
                  <div className="w-16 h-4 bg-muted animate-shimmer rounded" />
                ) : (
                  <span className="text-xs font-medium text-foreground">
                    {balance.toFixed(4)} SOL
                  </span>
                )}
              </div>
            </div>
          </div>
          <WalletMultiButton className="!bg-secondary hover:!bg-secondary/80 !text-secondary-foreground !border-none !rounded-lg !text-sm !px-3 !py-2" />
        </div>
      </CardContent>
    </Card>
  );
};