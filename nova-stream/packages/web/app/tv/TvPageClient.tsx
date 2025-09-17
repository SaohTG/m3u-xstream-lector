'use client';

import { useMemo, useState } from 'react';
import { LiveChannel } from '@novastream/shared';
import { PlayerHLS } from '@/components/PlayerHLS';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export function TvPageClient({ channels }: { channels: LiveChannel[] }) {
  const [selectedChannel, setSelectedChannel] = useState<LiveChannel | null>(channels[0] || null);
  const [selectedGroup, setSelectedGroup] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const groups = useMemo(() => {
    const groupSet = new Set(channels.map(c => c.group));
    return ['All', ...Array.from(groupSet).sort()];
  }, [channels]);

  const filteredChannels = useMemo(() => {
    return channels.filter(channel => {
      const inGroup = selectedGroup === 'All' || channel.group === selectedGroup;
      const inSearch = channel.title.toLowerCase().includes(searchQuery.toLowerCase());
      return inGroup && inSearch;
    });
  }, [channels, selectedGroup, searchQuery]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Player Section */}
      <div className="flex-1 flex flex-col bg-black">
        {selectedChannel ? (
          <PlayerHLS src={selectedChannel.url} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-white">
            <p>Select a channel to start playing</p>
          </div>
        )}
        {selectedChannel && (
            <div className="p-4 bg-gray-900 text-white">
                <h2 className="text-xl font-bold">{selectedChannel.title}</h2>
                <p className="text-sm text-gray-400">{selectedChannel.group}</p>
            </div>
        )}
      </div>

      {/* Playlist Section */}
      <aside className="w-96 flex flex-col border-l">
        <div className="p-2 border-b">
            <Input
                placeholder="Search channels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
        <div className='flex flex-1 overflow-y-hidden'>
            {/* Groups */}
            <ScrollArea className="w-1/3 border-r">
                <nav className="flex flex-col">
                {groups.map(group => (
                    <button
                        key={group}
                        onClick={() => setSelectedGroup(group)}
                        className={cn(
                            "p-2 text-left text-sm hover:bg-accent",
                            selectedGroup === group && "bg-accent font-semibold"
                        )}
                    >
                        {group}
                    </button>
                ))}
                </nav>
            </ScrollArea>
            {/* Channels */}
            <ScrollArea className="w-2/3">
                {filteredChannels.map(channel => (
                    <button
                        key={channel.id}
                        onClick={() => setSelectedChannel(channel)}
                        className={cn(
                            "w-full text-left p-2 flex items-center gap-2 hover:bg-accent",
                            selectedChannel?.id === channel.id && "bg-accent"
                        )}
                    >
                        {channel.logo && (
                            <Image src={channel.logo} alt={channel.title} width={40} height={40} className="w-10 h-10 object-contain rounded-sm" />
                        )}
                        <span className="flex-1 truncate text-sm">{channel.title}</span>
                    </button>
                ))}
            </ScrollArea>
        </div>
      </aside>
    </div>
  );
}
