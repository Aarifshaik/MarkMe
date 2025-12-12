'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Settings, Check, X, Loader2, Wifi, WifiOff } from 'lucide-react';
import { 
  getBackendUrl, 
  setBackendUrl, 
  checkBackendHealth,
  getApiKey,
  setApiKey,
  reconnectSocket
} from '@/services/mongodb-service';

type ConnectionStatus = 'idle' | 'testing' | 'connected' | 'failed';

export default function BackendSettings() {
  const [url, setUrl] = useState('');
  const [apiKey, setApiKeyValue] = useState('');
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [isOpen, setIsOpen] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');

  // Load current settings when popover opens
  useEffect(() => {
    if (isOpen) {
      const savedUrl = getBackendUrl();
      const savedKey = getApiKey();
      setUrl(savedUrl);
      setApiKeyValue(savedKey);
      setCurrentUrl(savedUrl);
      
      // Test current connection
      testConnection(savedUrl);
    }
  }, [isOpen]);

  const testConnection = async (testUrl?: string) => {
    setStatus('testing');
    try {
      // Temporarily set the URL if testing a new one
      const urlToTest = testUrl || url;
      if (urlToTest !== getBackendUrl()) {
        setBackendUrl(urlToTest);
      }
      
      const healthy = await checkBackendHealth();
      setStatus(healthy ? 'connected' : 'failed');
      
      // Restore original URL if test failed
      if (!healthy && urlToTest !== currentUrl) {
        setBackendUrl(currentUrl);
      }
    } catch {
      setStatus('failed');
      // Restore original URL on error
      if (url !== currentUrl) {
        setBackendUrl(currentUrl);
      }
    }
  };

  const handleSave = async () => {
    // Clean URL - remove trailing slash
    const cleanUrl = url.replace(/\/$/, '');
    
    // Set the new values
    setBackendUrl(cleanUrl);
    setApiKey(apiKey);
    setCurrentUrl(cleanUrl);
    
    // Test the connection
    await testConnection(cleanUrl);
    
    // Reconnect socket with new settings
    try {
      await reconnectSocket();
      console.log('🔌 Socket reconnected with new settings');
    } catch (err) {
      console.error('Failed to reconnect socket:', err);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'testing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <WifiOff className="h-4 w-4 text-red-500" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'testing':
        return 'Testing connection...';
      case 'connected':
        return 'Connected to backend';
      case 'failed':
        return 'Connection failed';
      default:
        return 'Backend Settings';
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="icon"
          className={`relative ${status === 'connected' ? 'border-green-500' : status === 'failed' ? 'border-red-500' : ''}`}
          title={getStatusText()}
        >
          {getStatusIcon()}
          {status === 'connected' && (
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full" />
          )}
          {status === 'failed' && (
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Backend Settings</h4>
            <p className="text-sm text-muted-foreground">
              Configure the MongoDB backend URL (e.g., Cloudflare Tunnel URL)
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="backend-url">Backend URL</Label>
              <Input
                id="backend-url"
                placeholder="https://your-tunnel.trycloudflare.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter the full URL including http:// or https://
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="Enter API key"
                value={apiKey}
                onChange={(e) => setApiKeyValue(e.target.value)}
              />
            </div>
          </div>

          {/* Status indicator */}
          <div className={`flex items-center gap-2 p-2 rounded-md ${
            status === 'connected' ? 'bg-green-50 text-green-700' :
            status === 'failed' ? 'bg-red-50 text-red-700' :
            status === 'testing' ? 'bg-blue-50 text-blue-700' :
            'bg-gray-50 text-gray-700'
          }`}>
            {getStatusIcon()}
            <span className="text-sm">{getStatusText()}</span>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleSave} 
              className="flex-1"
              disabled={status === 'testing'}
            >
              {status === 'testing' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Save & Test
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => testConnection()}
              disabled={status === 'testing'}
            >
              Test
            </Button>
          </div>

          {/* Current active URL display */}
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Current URL: <code className="bg-muted px-1 py-0.5 rounded text-xs">{currentUrl}</code>
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
