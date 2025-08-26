import React from 'react';
                className="h-8 px-2 hover:bg-muted/50"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
            <code className="text-xs text-foreground font-mono break-all">
              {result.signature}
            </code>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
          <Button
            onClick={openSolscan}
            className="bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold py-3 shadow-primary-glow transition-all duration-300"
          >
            <Eye className="mr-2 h-4 w-4" />
            View on Solscan
          </Button>
          
          <Button
            onClick={openRaydium}
            variant="outline"
            className="border-accent/30 text-accent hover:bg-accent/10 font-semibold py-3 transition-all duration-300"
          >
            <Droplets className="mr-2 h-4 w-4" />
            Create Liquidity
          </Button>

          <Button
            onClick={() => copyToClipboard(result.mint, 'Mint address')}
            variant="outline"
            className="border-border/50 hover:bg-muted/50 font-semibold py-3 transition-all duration-300"
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy Mint
          </Button>
        </div>

        {/* Secondary Actions */}
        <div className="space-y-3">
          <Button
            onClick={onCreateAnother}
            variant="outline"
            className="w-full border-primary/30 text-primary hover:bg-primary/10 font-semibold py-4 transition-all duration-300"
          >
            <Plus className="mr-2 h-5 w-5" />
            Create Another Token
          </Button>
        </div>

        {/* Raydium Integration Tips */}
        <div className="bg-gradient-hero rounded-lg p-4 border border-primary/20">
          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center space-x-2">
            <Droplets className="h-4 w-4 text-primary" />
            <span>Raydium Integration</span>
          </h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Your token is ready for Raydium liquidity pools</li>
            <li>• Use the "Create Liquidity" button to add SOL/Token pairs</li>
            <li>• Ensure you have enough SOL and tokens for initial liquidity</li>
            <li>• Consider starting with a small liquidity amount for testing</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};