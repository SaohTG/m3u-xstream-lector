'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { linkPlaylist } from '@/lib/api';
import { LinkPlaylistDto } from '@novastream/shared';

type FormData = Omit<LinkPlaylistDto, 'type'>;

export function LinkSourceForms() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();

  const { mutate, isPending } = useMutation({
    mutationFn: linkPlaylist,
    onSuccess: () => {
      toast({
        title: 'Success!',
        description: 'Your playlist has been linked.',
      });
      queryClient.invalidateQueries({ queryKey: ['playlist', 'active'] });
      router.refresh();
      router.push('/tv');
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: error.response?.data?.message || 'An unknown error occurred.',
      });
    },
  });

  const {
    register: registerM3U,
    handleSubmit: handleM3U,
    formState: { errors: errorsM3U },
  } = useForm<FormData>();

  const {
    register: registerXtream,
    handleSubmit: handleXtream,
    formState: { errors: errorsXtream },
  } = useForm<FormData>();

  const onM3USubmit = (data: FormData) => mutate({ ...data, type: 'M3U' });
  const onXtreamSubmit = (data: FormData) => mutate({ ...data, type: 'XTREAM' });

  return (
    <Tabs defaultValue="m3u" className="w-full max-w-lg">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="m3u">M3U</TabsTrigger>
        <TabsTrigger value="xtream">Xtream</TabsTrigger>
      </TabsList>

      <TabsContent value="m3u">
        <form onSubmit={handleM3U(onM3USubmit)}>
            <Card>
                <CardHeader>
                    <CardTitle>Link M3U Playlist</CardTitle>
                    <CardDescription>Enter the URL of your .m3u or .m3u8 file.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="m3u-name">Name (Optional)</Label>
                        <Input id="m3u-name" {...registerM3U('name')} placeholder="My M3U Playlist"/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="m3u-url">M3U URL</Label>
                        <Input id="m3u-url" {...registerM3U('url', { required: 'URL is required' })} placeholder="http://provider.com/playlist.m3u"/>
                        {errorsM3U.url && <p className="text-sm text-destructive">{errorsM3U.url.message}</p>}
                    </div>
                    <Button type="submit" disabled={isPending}>{isPending ? 'Linking...' : 'Link M3U'}</Button>
                </CardContent>
            </Card>
        </form>
      </TabsContent>

      <TabsContent value="xtream">
        <form onSubmit={handleXtream(onXtreamSubmit)}>
            <Card>
                <CardHeader>
                    <CardTitle>Link Xtream Playlist</CardTitle>
                    <CardDescription>Enter your Xtream Codes credentials.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="xtream-name">Name (Optional)</Label>
                        <Input id="xtream-name" {...registerXtream('name')} placeholder="My Xtream Playlist"/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="xtream-host">Host</Label>
                        <Input id="xtream-host" {...registerXtream('host', { required: 'Host is required' })} placeholder="http://provider.com:8080"/>
                        {errorsXtream.host && <p className="text-sm text-destructive">{errorsXtream.host.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="xtream-username">Username</Label>
                        <Input id="xtream-username" {...registerXtream('username', { required: 'Username is required' })} />
                        {errorsXtream.username && <p className="text-sm text-destructive">{errorsXtream.username.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="xtream-password">Password</Label>
                        <Input id="xtream-password" type="password" {...registerXtream('password', { required: 'Password is required' })}/>
                        {errorsXtream.password && <p className="text-sm text-destructive">{errorsXtream.password.message}</p>}
                    </div>
                    <Button type="submit" disabled={isPending}>{isPending ? 'Linking...' : 'Link Xtream'}</Button>
                </CardContent>
            </Card>
        </form>
      </TabsContent>
    </Tabs>
  );
}
