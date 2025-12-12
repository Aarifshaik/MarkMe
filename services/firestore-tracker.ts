/**
 * Firestore Operation Tracker
 * Logs all read/write operations to console for monitoring
 */

interface OperationStats {
  reads: number;
  writes: number;
  deletes: number;
  listenerUpdates: number;
  sessionStart: Date;
}

class FirestoreTracker {
  private static instance: FirestoreTracker;
  private stats: OperationStats = {
    reads: 0,
    writes: 0,
    deletes: 0,
    listenerUpdates: 0,
    sessionStart: new Date(),
  };

  private constructor() {
    // Log stats every 30 seconds
    if (typeof window !== 'undefined') {
      setInterval(() => this.logSummary(), 30000);
    }
  }

  public static getInstance(): FirestoreTracker {
    if (!FirestoreTracker.instance) {
      FirestoreTracker.instance = new FirestoreTracker();
    }
    return FirestoreTracker.instance;
  }

  /**
   * Track a read operation
   */
  trackRead(collection: string, docCount: number, source: string) {
    this.stats.reads += docCount;
    console.log(
      `📖 READ: ${docCount} docs from "${collection}" [${source}] | Total: ${this.stats.reads} reads`
    );
  }

  /**
   * Track a write operation
   */
  trackWrite(collection: string, docId: string, source: string) {
    this.stats.writes += 1;
    console.log(
      `✏️ WRITE: "${collection}/${docId}" [${source}] | Total: ${this.stats.writes} writes`
    );
  }

  /**
   * Track a delete operation
   */
  trackDelete(collection: string, docId: string, source: string) {
    this.stats.deletes += 1;
    console.log(
      `🗑️ DELETE: "${collection}/${docId}" [${source}] | Total: ${this.stats.deletes} deletes`
    );
  }

  /**
   * Track a listener update (real-time subscription)
   * NOTE: Listener updates do NOT count as reads in Firestore billing!
   * Only the initial snapshot and new/modified docs are billed.
   */
  trackListenerUpdate(collection: string, docCount: number, source: string) {
    this.stats.listenerUpdates += 1;
    console.log(
      `🔴 LISTENER: ${docCount} docs from "${collection}" [${source}] | Updates: ${this.stats.listenerUpdates}`
    );
  }

  /**
   * Log current stats summary
   */
  logSummary() {
    const sessionMinutes = Math.round(
      (Date.now() - this.stats.sessionStart.getTime()) / 60000
    );
    console.log(`
╔════════════════════════════════════════════════════════════╗
║              FIRESTORE OPERATION SUMMARY                    ║
╠════════════════════════════════════════════════════════════╣
║  📖 Total Reads:          ${this.stats.reads.toString().padStart(8)}                      ║
║  ✏️  Total Writes:         ${this.stats.writes.toString().padStart(8)}                      ║
║  🗑️  Total Deletes:        ${this.stats.deletes.toString().padStart(8)}                      ║
║  🔴 Listener Updates:     ${this.stats.listenerUpdates.toString().padStart(8)}                      ║
║  ⏱️  Session Duration:     ${sessionMinutes.toString().padStart(5)} min                      ║
╚════════════════════════════════════════════════════════════╝
    `);
  }

  /**
   * Get current stats
   */
  getStats(): OperationStats {
    return { ...this.stats };
  }

  /**
   * Reset stats
   */
  reset() {
    this.stats = {
      reads: 0,
      writes: 0,
      deletes: 0,
      listenerUpdates: 0,
      sessionStart: new Date(),
    };
    console.log('🔄 Firestore tracker stats reset');
  }
}

export const firestoreTracker = FirestoreTracker.getInstance();

// Expose to window for debugging in browser console
if (typeof window !== 'undefined') {
  (window as unknown as { firestoreTracker: typeof firestoreTracker }).firestoreTracker = firestoreTracker;
  console.log('💡 Firestore tracker available! Type `firestoreTracker.logSummary()` in console anytime');
}
