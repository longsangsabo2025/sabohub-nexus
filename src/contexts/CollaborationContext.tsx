import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UserPresence {
  userId: string;
  userName: string;
  online: boolean;
  lastSeen: Date;
  currentPage?: string;
  cursorPosition?: { x: number; y: number };
}

interface CollaborationContextType {
  presence: UserPresence[];
  isConnected: boolean;
  updatePresence: (data: Partial<UserPresence>) => void;
  broadcastEvent: (event: string, data: any) => void;
  onEvent: (event: string, callback: (data: any) => void) => void;
}

const CollaborationContext = createContext<CollaborationContextType | undefined>(undefined);

export function CollaborationProvider({ children }: { children: ReactNode }) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [presence, setPresence] = useState<UserPresence[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [eventHandlers, setEventHandlers] = useState<Map<string, (data: any) => void>>(
    new Map()
  );

  useEffect(() => {
    const initializeChannel = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create channel for real-time collaboration
      const collaborationChannel = supabase.channel('collaboration', {
        config: {
          presence: {
            key: user.id,
          },
        },
      });

      // Track presence
      collaborationChannel
        .on('presence', { event: 'sync' }, () => {
          const state = collaborationChannel.presenceState();
          const users: UserPresence[] = [];

          Object.keys(state).forEach((key) => {
            const presences = state[key] as any[];
            presences.forEach((p) => {
              users.push({
                userId: p.userId,
                userName: p.userName,
                online: true,
                lastSeen: new Date(p.lastSeen),
                currentPage: p.currentPage,
                cursorPosition: p.cursorPosition,
              });
            });
          });

          setPresence(users);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('User joined:', key, newPresences);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('User left:', key, leftPresences);
        })
        .on('broadcast', { event: '*' }, ({ event, payload }) => {
          const handler = eventHandlers.get(event);
          if (handler) {
            handler(payload);
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            // Set initial presence
            await collaborationChannel.track({
              userId: user.id,
              userName: user.email,
              online: true,
              lastSeen: new Date().toISOString(),
              currentPage: window.location.pathname,
            });
          }
        });

      setChannel(collaborationChannel);

      // Track page visibility
      const handleVisibilityChange = () => {
        if (document.hidden) {
          collaborationChannel.track({
            userId: user.id,
            userName: user.email,
            online: false,
            lastSeen: new Date().toISOString(),
          });
        } else {
          collaborationChannel.track({
            userId: user.id,
            userName: user.email,
            online: true,
            lastSeen: new Date().toISOString(),
            currentPage: window.location.pathname,
          });
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        collaborationChannel.unsubscribe();
      };
    };

    initializeChannel();
  }, []);

  const updatePresence = async (data: Partial<UserPresence>) => {
    if (!channel) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await channel.track({
      userId: user.id,
      userName: user.email,
      online: true,
      lastSeen: new Date().toISOString(),
      ...data,
    });
  };

  const broadcastEvent = (event: string, data: any) => {
    if (!channel) return;
    channel.send({
      type: 'broadcast',
      event,
      payload: data,
    });
  };

  const onEvent = (event: string, callback: (data: any) => void) => {
    setEventHandlers((prev) => new Map(prev).set(event, callback));
  };

  return (
    <CollaborationContext.Provider
      value={{
        presence,
        isConnected,
        updatePresence,
        broadcastEvent,
        onEvent,
      }}
    >
      {children}
    </CollaborationContext.Provider>
  );
}

export function useCollaboration() {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within CollaborationProvider');
  }
  return context;
}

// Hook for tracking cursor position
export function useCursorTracking() {
  const { updatePresence } = useCollaboration();
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });

      // Throttle updates
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        updatePresence({
          cursorPosition: { x: e.clientX, y: e.clientY },
        });
      }, 100);
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeoutId);
    };
  }, [updatePresence]);

  return position;
}

// Hook for live comments
export function useLiveComments(entityId: string) {
  const { broadcastEvent, onEvent } = useCollaboration();
  const [comments, setComments] = useState<any[]>([]);

  useEffect(() => {
    const handleNewComment = (data: any) => {
      if (data.entityId === entityId) {
        setComments((prev) => [...prev, data.comment]);
      }
    };

    onEvent('new-comment', handleNewComment);
  }, [entityId, onEvent]);

  const addComment = (comment: any) => {
    broadcastEvent('new-comment', {
      entityId,
      comment,
    });
    setComments((prev) => [...prev, comment]);
  };

  return { comments, addComment };
}
