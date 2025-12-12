'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  getBackendConfig, 
  checkBackendHealth,
  reconnectSocket,
  isBackendConnected,
  onConnectionChange
} from '@/services/mongodb-service';

interface LogEntry {
  time: string;
  type: 'info' | 'success' | 'error' | 'event';
  message: string;
}

export default function SocketDebugPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [config, setConfig] = useState({ apiUrl: '', socketUrl: '', apiKey: '' });

  const addLog = (type: LogEntry['type'], message: string) => {
    const entry: LogEntry = {
      time: new Date().toLocaleTimeString(),
      type,
      message
    };
    setLogs(prev => [entry, ...prev].slice(0, 50));
  };

  useEffect(() => {
    // Get config
    const cfg = getBackendConfig();
    setConfig(cfg);
    addLog('info', `API URL: ${cfg.apiUrl}`);
    addLog('info', `Socket URL: ${cfg.socketUrl}`);
    addLog('info', `API Key: ${cfg.apiKey.substring(0, 3)}***`);

    // Listen for connection changes
    const unsubscribe = onConnectionChange((connected) => {
      setIsConnected(connected);
      addLog(connected ? 'success' : 'error', 
        connected ? 'Socket CONNECTED' : 'Socket DISCONNECTED');
    });

    return () => unsubscribe();
  }, []);

  const testHealth = async () => {
    addLog('info', 'Testing backend health...');
    try {
      const healthy = await checkBackendHealth();
      addLog(healthy ? 'success' : 'error', 
        healthy ? 'Backend is healthy!' : 'Backend health check FAILED');
    } catch (err) {
      addLog('error', `Health check error: ${err}`);
    }
  };

  const testReconnect = async () => {
    addLog('info', 'Reconnecting socket...');
    try {
      await reconnectSocket();
      addLog('success', 'Socket reconnect triggered');
    } catch (err) {
      addLog('error', `Reconnect error: ${err}`);
    }
  };

  const clearLogs = () => setLogs([]);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Socket.io Debug Panel
              <Badge variant={isConnected ? 'default' : 'destructive'}>
                {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <strong>API URL:</strong>
                <div className="text-xs text-gray-600 break-all">{config.apiUrl}</div>
              </div>
              <div>
                <strong>Socket URL:</strong>
                <div className="text-xs text-gray-600 break-all">{config.socketUrl}</div>
              </div>
              <div>
                <strong>API Key:</strong>
                <div className="text-xs text-gray-600">{config.apiKey.substring(0, 5)}***</div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={testHealth}>Test Health</Button>
              <Button onClick={testReconnect} variant="outline">Reconnect Socket</Button>
              <Button onClick={clearLogs} variant="ghost">Clear Logs</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Event Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-black text-green-400 font-mono text-sm p-4 rounded-lg h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-gray-500">Waiting for events...</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className={`py-1 ${
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'success' ? 'text-green-400' :
                    log.type === 'event' ? 'text-yellow-400' :
                    'text-gray-400'
                  }`}>
                    [{log.time}] {log.message}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>1. Check that the connection status shows "Connected" (green)</p>
            <p>2. Open browser DevTools → Console to see socket events</p>
            <p>3. Open another tab with the Kiosk interface</p>
            <p>4. Mark attendance for any employee</p>
            <p>5. Watch the console for "📡 [MongoDB] Real-time update" messages</p>
            <p className="text-amber-600 font-medium mt-4">
              If not connected: Check that your backend server is running and the URL/API key are correct.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
