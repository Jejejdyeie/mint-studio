import React, { useState } from 'react';
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="symbol" className="text-foreground font-medium">
                Symbol
              </Label>
              <Input
                id="symbol"
                placeholder="MAT"
                className="bg-muted/50 border-border/50 focus:border-primary focus:ring-primary/20"
                {...register('symbol')}
                onChange={(e) => setValue('symbol', e.target.value.toUpperCase())}
              />
              {errors.symbol && (
                <p className="text-destructive text-sm">{errors.symbol.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="decimals" className="text-foreground font-medium">
                Decimals
              </Label>
              <Input
                id="decimals"
                type="number"
                min="0"
                max="9"
                className="bg-muted/50 border-border/50 focus:border-primary focus:ring-primary/20"
                {...register('decimals', { valueAsNumber: true })}
              />
              {errors.decimals && (
                <p className="text-destructive text-sm">{errors.decimals.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="initialSupply" className="text-foreground font-medium">
                Initial Supply
              </Label>
              <Input
                id="initialSupply"
                type="number"
                min="1"
                placeholder="1000000"
                className="bg-muted/50 border-border/50 focus:border-primary focus:ring-primary/20"
                {...register('initialSupply', { valueAsNumber: true })}
              />
              {errors.initialSupply && (
                <p className="text-destructive text-sm">{errors.initialSupply.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="metadataUri" className="text-foreground font-medium">
              Metadata URI (Optional)
            </Label>
            <Textarea
              id="metadataUri"
              placeholder="https://example.com/metadata.json"
              className="bg-muted/50 border-border/50 focus:border-primary focus:ring-primary/20 min-h-[80px]"
              {...register('metadataUri')}
            />
            {errors.metadataUri && (
              <p className="text-destructive text-sm">{errors.metadataUri.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Optional: Link to JSON metadata containing token description, image, etc.
            </p>
          </div>

          <Button 
            type="submit" 
            disabled={!wallet.connected || isCreating}
            className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold py-6 text-lg shadow-primary-glow hover:shadow-xl transition-all duration-300"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating Token...
              </>
            ) : (
              <>
                <Coins className="mr-2 h-5 w-5" />
                Create Token
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};