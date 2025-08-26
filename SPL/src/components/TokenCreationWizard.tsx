import React, { useState, useEffect } from 'react';
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