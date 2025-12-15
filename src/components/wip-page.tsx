
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Coffee, Wrench } from 'lucide-react';

export function WipPage() {
    return (
        <div className="flex h-full min-h-[60vh] w-full items-center justify-center">
            <Card className="glass-pane w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto bg-accent/20 text-accent p-3 rounded-full w-fit">
                        <Wrench className="h-8 w-8" />
                    </div>
                    <CardTitle className="mt-4 font-headline text-2xl">Under Construction</CardTitle>
                    <CardDescription>
                        This part of the app is currently being worked on. Please check back later!
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="glow" asChild>
                        <a href="https://buymeacoffee.com/yourusername" target="_blank" rel="noopener noreferrer">
                           <Coffee className="mr-2" /> Buy Liquid a Coffee!
                        </a>
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
