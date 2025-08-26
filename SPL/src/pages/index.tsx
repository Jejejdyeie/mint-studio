import React from 'react';
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div className="bg-gradient-hero rounded-lg p-6 border border-primary/20">
          <div className="p-2 rounded-full bg-primary/10 border border-primary/20 w-fit mx-auto mb-3">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">Secure & Trustless</h3>
          <p className="text-sm text-muted-foreground">
            Your keys, your tokens. All operations happen directly through your wallet.
          </p>
        </div>

        <div className="bg-gradient-hero rounded-lg p-6 border border-accent/20">
          <div className="p-2 rounded-full bg-accent/10 border border-accent/20 w-fit mx-auto mb-3">
            <Code className="h-6 w-6 text-accent" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">Developer Friendly</h3>
          <p className="text-sm text-muted-foreground">
            Built with modern Web3 stack: TypeScript, React, and Solana Web3.js.
          </p>
        </div>

        <div className="bg-gradient-hero rounded-lg p-6 border border-primary/20">
          <div className="p-2 rounded-full bg-primary/10 border border-primary/20 w-fit mx-auto mb-3">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">Lightning Fast</h3>
          <p className="text-sm text-muted-foreground">
            Deploy your token in under 30 seconds with automatic metadata support.
          </p>
        </div>
      </div>
    </div>
  );
};

const AppContent = () => {
  const { connected } = useWallet();

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <HeroSection />
        
        <div className="max-w-2xl mx-auto space-y-8">
          <WalletConnect />
          
          {connected && (
            <div className="animate-in slide-in-from-bottom-5 duration-500">
              <TokenCreationWizard />
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-20 text-center text-muted-foreground text-sm">
          <div className="border-t border-border/20 pt-8">
            <p>Built on Solana Devnet • Open Source • Web3 Native</p>
            <p className="mt-2">
              Always verify transactions in your wallet before signing
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

const Index = () => {
  return (
    <WalletProviderContext>
      <AppContent />
    </WalletProviderContext>
  );
};

export default Index;