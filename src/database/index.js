const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app } = require('electron');
const fs = require('fs');

const userDataPath = app ? app.getPath('userData') : path.join(process.cwd(), 'userData');
const dbPath = path.join(userDataPath, 'signals.db');

if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to the signals database.');
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      sourceContext TEXT NOT NULL,
      whyItMatters TEXT NOT NULL,
      dateCreated TEXT NOT NULL,
      followUpNeeded INTEGER DEFAULT 0,
      categoryTags TEXT
    )
  `, (err) => {
    if (err) {
      console.error('Error creating signals table:', err.message);
    } else {
      console.log('Signals table initialized.');
    }
  });
}

const database = {
  createSignal(signal) {
    return new Promise((resolve, reject) => {
      const { title, sourceContext, whyItMatters, categoryTags, dateCreated, followUpNeeded = 0 } = signal;
      const tagsString = JSON.stringify(categoryTags || []);
      
      db.run(
        `INSERT INTO signals (title, sourceContext, whyItMatters, dateCreated, followUpNeeded, categoryTags) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [title, sourceContext, whyItMatters, dateCreated, followUpNeeded, tagsString],
        function(err) {
          if (err) {
            reject(err);
          } else {
            db.get('SELECT * FROM signals WHERE id = ?', [this.lastID], (err, row) => {
              if (err) {
                reject(err);
              } else {
                resolve(formatSignal(row));
              }
            });
          }
        }
      );
    });
  },

  getSignals() {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM signals ORDER BY dateCreated DESC', (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map(formatSignal));
        }
      });
    });
  },

  getSignalById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM signals WHERE id = ?', [id], (err, row) => {
        if (err) {
          reject(err);
        } else if (!row) {
          reject(new Error('Signal not found'));
        } else {
          resolve(formatSignal(row));
        }
      });
    });
  },

  updateSignal(id, signal) {
    return new Promise((resolve, reject) => {
      const { title, sourceContext, whyItMatters, categoryTags, followUpNeeded } = signal;
      const tagsString = JSON.stringify(categoryTags || []);
      
      db.run(
        `UPDATE signals 
         SET title = ?, sourceContext = ?, whyItMatters = ?, categoryTags = ?, followUpNeeded = ? 
         WHERE id = ?`,
        [title, sourceContext, whyItMatters, tagsString, followUpNeeded || 0, id],
        function(err) {
          if (err) {
            reject(err);
          } else if (this.changes === 0) {
            reject(new Error('Signal not found'));
          } else {
            db.get('SELECT * FROM signals WHERE id = ?', [id], (err, row) => {
              if (err) {
                reject(err);
              } else {
                resolve(formatSignal(row));
              }
            });
          }
        }
      );
    });
  },

  deleteSignal(id) {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM signals WHERE id = ?', [id], function(err) {
        if (err) {
          reject(err);
        } else if (this.changes === 0) {
          reject(new Error('Signal not found'));
        } else {
          resolve({ id, deleted: true });
        }
      });
    });
  },

  searchSignals(query) {
    return new Promise((resolve, reject) => {
      const searchQuery = `%${query}%`;
      db.all(
        `SELECT * FROM signals 
         WHERE title LIKE ? OR sourceContext LIKE ? OR whyItMatters LIKE ? 
         ORDER BY dateCreated DESC`,
        [searchQuery, searchQuery, searchQuery],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows.map(formatSignal));
          }
        }
      );
    });
  },

  filterSignalsByTag(tag) {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM signals ORDER BY dateCreated DESC', (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const filtered = rows
            .map(formatSignal)
            .filter(signal => signal.categoryTags.includes(tag));
          resolve(filtered);
        }
      });
    });
  },

  getTags() {
    return new Promise((resolve, reject) => {
      db.all('SELECT categoryTags FROM signals', (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const allTags = new Set();
          rows.forEach(row => {
            try {
              const tags = JSON.parse(row.categoryTags || '[]');
              tags.forEach(tag => allTags.add(tag));
            } catch (e) {
              console.error('Error parsing tags:', e);
            }
          });
          resolve(Array.from(allTags));
        }
      });
    });
  },

  close() {
    return new Promise((resolve, reject) => {
      db.close(err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
};

function formatSignal(row) {
  if (!row) return null;
  
  let categoryTags = [];
  try {
    categoryTags = JSON.parse(row.categoryTags || '[]');
  } catch (e) {
    console.error('Error parsing tags:', e);
  }
  
  return {
    id: row.id,
    title: row.title,
    sourceContext: row.sourceContext,
    whyItMatters: row.whyItMatters,
    dateCreated: row.dateCreated,
    followUpNeeded: Boolean(row.followUpNeeded),
    categoryTags
  };
}

module.exports = database;
