// ===================================================================
// DATABASE SERVICE - SQLite
// ===================================================================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'calls.db');
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Database error:', err);
      } else {
        console.log('✅ Database connected');
      }
    });
  }

  initialize() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS calls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vonageCallId TEXT,
        phoneNumber TEXT NOT NULL,
        otpCode TEXT NOT NULL,
        language TEXT DEFAULT 'en-US',
        transferNumber TEXT,
        status TEXT DEFAULT 'initiated',
        dtmfInput TEXT,
        verified BOOLEAN DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        answeredAt TEXT,
        verifiedAt TEXT,
        dtmfReceivedAt TEXT,
        endedAt TEXT,
        duration INTEGER,
        recordingUrl TEXT
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS transcripts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        callId INTEGER,
        text TEXT NOT NULL,
        confidence REAL,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (callId) REFERENCES calls(id)
      )
    `);

    this.db.run('CREATE INDEX IF NOT EXISTS idx_calls_vonage ON calls(vonageCallId)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_calls_phone ON calls(phoneNumber)');
  }

  createCall(data) {
    const { phoneNumber, otpCode, language, transferNumber, status } = data;
    
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO calls (phoneNumber, otpCode, language, transferNumber, status) 
         VALUES (?, ?, ?, ?, ?)`,
        [phoneNumber, otpCode, language || 'en-US', transferNumber, status || 'initiated'],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  updateCall(callId, data) {
    const fields = Object.keys(data).map(key => `${key} = ?`);
    const values = [...Object.values(data), callId];

    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE calls SET ${fields.join(', ')} WHERE id = ?`,
        values,
        (err) => err ? reject(err) : resolve()
      );
    });
  }

  updateCallByVonageId(vonageCallId, data) {
    const fields = Object.keys(data).map(key => `${key} = ?`);
    const values = [...Object.values(data), vonageCallId];

    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE calls SET ${fields.join(', ')} WHERE vonageCallId = ?`,
        values,
        (err) => err ? reject(err) : resolve()
      );
    });
  }

  getCallById(callId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM calls WHERE id = ?',
        [callId],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });
  }

  getCallByVonageId(vonageCallId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM calls WHERE vonageCallId = ?',
        [vonageCallId],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });
  }

  getAllCalls(limit = 100) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM calls ORDER BY createdAt DESC LIMIT ?',
        [limit],
        (err, rows) => err ? reject(err) : resolve(rows)
      );
    });
  }

  addTranscript(callId, text, confidence = null) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO transcripts (callId, text, confidence) VALUES (?, ?, ?)',
        [callId, text, confidence],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  getTranscripts(callId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM transcripts WHERE callId = ? ORDER BY timestamp ASC',
        [callId],
        (err, rows) => err ? reject(err) : resolve(rows)
      );
    });
  }

  getStats() {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT 
          COUNT(*) as totalCalls,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedCalls,
          SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) as verifiedCalls,
          SUM(CASE WHEN status = 'failed' OR status = 'rejected' THEN 1 ELSE 0 END) as failedCalls,
          AVG(duration) as avgDuration
        FROM calls`,
        (err, row) => err ? reject(err) : resolve(row)
      );
    });
  }

  isHealthy() {
    try {
      this.db.get('SELECT 1', () => {});
      return true;
    } catch {
      return false;
    }
  }

  close() {
    this.db.close();
  }
}

module.exports = Database;
