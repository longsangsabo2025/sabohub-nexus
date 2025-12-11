import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

// Keyboard shortcuts configuration
const shortcuts = {
  // Navigation
  'g d': { action: 'navigate', path: '/dashboard', description: 'Go to Dashboard' },
  'g c': { action: 'navigate', path: '/ceo/dashboard', description: 'Go to CEO Dashboard' },
  'g e': { action: 'navigate', path: '/employees', description: 'Go to Employees' },
  'g t': { action: 'navigate', path: '/tasks', description: 'Go to Tasks' },
  'g a': { action: 'navigate', path: '/attendance', description: 'Go to Attendance' },
  'g s': { action: 'navigate', path: '/schedules', description: 'Go to Schedules' },
  'g r': { action: 'navigate', path: '/reports', description: 'Go to Reports' },
  'g k': { action: 'navigate', path: '/kpi', description: 'Go to KPI' },
  'g p': { action: 'navigate', path: '/approvals', description: 'Go to Approvals' },
  
  // Actions
  'c t': { action: 'create-task', description: 'Create new task' },
  'c e': { action: 'create-employee', description: 'Create new employee' },
  'a a': { action: 'approve-all', description: 'Approve all pending requests' },
  '/ ': { action: 'search', description: 'Focus search' },
  '?': { action: 'help', description: 'Show keyboard shortcuts' },
};

export const useKeyboardShortcuts = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  let keys: string[] = [];
  let keyTimeout: NodeJS.Timeout;

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    // Ignore if user is typing in input/textarea
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    // Add key to sequence
    keys.push(e.key);
    
    // Clear timeout
    if (keyTimeout) clearTimeout(keyTimeout);

    // Set new timeout to reset keys after 1 second
    keyTimeout = setTimeout(() => {
      keys = [];
    }, 1000);

    // Check if sequence matches any shortcut
    const sequence = keys.join(' ');
    const shortcut = shortcuts[sequence as keyof typeof shortcuts];

    if (shortcut) {
      e.preventDefault();
      keys = []; // Reset keys
      
      // Execute action
      switch (shortcut.action) {
        case 'navigate':
          navigate(shortcut.path);
          toast({
            title: 'Navigated',
            description: shortcut.description,
            duration: 1500,
          });
          break;
        
        case 'create-task':
          // Trigger create task modal
          window.dispatchEvent(new CustomEvent('open-create-task-modal'));
          toast({
            title: 'Create Task',
            description: 'Opening task creation form',
            duration: 1500,
          });
          break;
        
        case 'create-employee':
          // Trigger create employee modal
          window.dispatchEvent(new CustomEvent('open-create-employee-modal'));
          toast({
            title: 'Create Employee',
            description: 'Opening employee form',
            duration: 1500,
          });
          break;
        
        case 'approve-all':
          // Trigger approve all action
          window.dispatchEvent(new CustomEvent('approve-all-requests'));
          toast({
            title: 'Approve All',
            description: 'Approving all pending requests',
            duration: 1500,
          });
          break;
        
        case 'search':
          // Focus search input
          const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
          }
          break;
        
        case 'help':
          // Show help modal
          window.dispatchEvent(new CustomEvent('show-shortcuts-help'));
          break;
      }
    }
  }, [navigate, toast]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      if (keyTimeout) clearTimeout(keyTimeout);
    };
  }, [handleKeyPress]);

  return { shortcuts };
};

// Shortcuts Help Component
export const ShortcutsHelp = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Keyboard Shortcuts</h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-6">
            {/* Navigation Section */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Navigation</h3>
              <div className="space-y-2">
                {Object.entries(shortcuts)
                  .filter(([_, s]) => s.action === 'navigate')
                  .map(([key, shortcut]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{shortcut.description}</span>
                      <kbd className="px-3 py-1 bg-muted rounded text-sm font-mono">
                        {key}
                      </kbd>
                    </div>
                  ))}
              </div>
            </div>

            {/* Actions Section */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Actions</h3>
              <div className="space-y-2">
                {Object.entries(shortcuts)
                  .filter(([_, s]) => s.action !== 'navigate')
                  .map(([key, shortcut]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{shortcut.description}</span>
                      <kbd className="px-3 py-1 bg-muted rounded text-sm font-mono">
                        {key}
                      </kbd>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-muted-foreground">
              Press <kbd className="px-2 py-1 bg-muted rounded text-xs">?</kbd> anytime to show this help
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
