const express = require('express');
const initSqlJs = require('sql.js');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 数据库文件路径
const DB_PATH = path.join(__dirname, 'ledger.db');

let db;
let SQL;

// 初始化 sql.js 数据库
async function initDB() {
  SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
    db.run(`
      CREATE TABLE transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL DEFAULT 'expense',
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        note TEXT DEFAULT '',
        date TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
      )
    `);

    // 插入示例数据
    const sampleData = [
      { type: 'expense', category: '餐饮', amount: 35.5, note: '午餐', date: '2026-09-01' },
      { type: 'expense', category: '交通', amount: 12, note: '地铁', date: '2026-09-01' },
      { type: 'expense', category: '餐饮', amount: 42, note: '晚餐', date: '2026-09-02' },
      { type: 'expense', category: '购物', amount: 199, note: '运动鞋', date: '2026-09-03' },
      { type: 'income', category: '工资', amount: 12000, note: '9月工资', date: '2026-09-05' },
      { type: 'expense', category: '餐饮', amount: 28, note: '早餐', date: '2026-09-05' },
      { type: 'expense', category: '娱乐', amount: 80, note: '电影票', date: '2026-09-06' },
      { type: 'expense', category: '餐饮', amount: 56, note: '聚餐', date: '2026-09-06' },
      { type: 'expense', category: '水电', amount: 150, note: '电费', date: '2026-09-07' },
      { type: 'income', category: '兼职', amount: 800, note: '稿费', date: '2026-09-07' },
      { type: 'expense', category: '交通', amount: 15, note: '打车', date: '2026-09-08' },
    ];
    for (const t of sampleData) {
      db.run('INSERT INTO transactions (type, category, amount, note, date) VALUES (?, ?, ?, ?, ?)',
        [t.type, t.category, t.amount, t.note, t.date]);
    }
    persist();
  }
}

// 持久化到文件
function persist() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// 执行查询并返回 JSON 数组
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// ========== API 路由 ==========

// 获取所有账单
app.get('/api/transactions', (req, res) => {
  const rows = queryAll('SELECT * FROM transactions ORDER BY date DESC, id DESC');
  res.json(rows.map(r => ({ ...r, amount: Number(r.amount) })));
});

// 新增账单
app.post('/api/transactions', (req, res) => {
  const { type, category, amount, note, date } = req.body;
  if (!category || amount == null || !date) {
    return res.status(400).json({ error: '缺少必填字段' });
  }
  db.run('INSERT INTO transactions (type, category, amount, note, date) VALUES (?, ?, ?, ?, ?)',
    [type || 'expense', category, amount, note || '', date]);
  const result = queryAll('SELECT last_insert_rowid() as id');
  persist();
  res.json({ id: result[0].id, message: '新增成功' });
});

// 更新账单
app.put('/api/transactions/:id', (req, res) => {
  const { type, category, amount, note, date } = req.body;
  db.run('UPDATE transactions SET type=?, category=?, amount=?, note=?, date=? WHERE id=?',
    [type, category, amount, note, date, req.params.id]);
  persist();
  res.json({ message: '更新成功' });
});

// 删除账单
app.delete('/api/transactions/:id', (req, res) => {
  db.run('DELETE FROM transactions WHERE id=?', [req.params.id]);
  persist();
  res.json({ message: '删除成功' });
});

// 获取月度统计（按分类汇总）
app.get('/api/stats/monthly', (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const rows = queryAll(`
    SELECT type, category, SUM(amount) as total
    FROM transactions
    WHERE substr(date, 1, 7) = ?
    GROUP BY type, category
    ORDER BY total DESC
  `, [month]);
  res.json({ month, data: rows.map(r => ({ ...r, total: Number(r.total) })) });
});

// 获取每日趋势
app.get('/api/stats/daily', (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const rows = queryAll(`
    SELECT date,
           SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense,
           SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income
    FROM transactions
    WHERE substr(date, 1, 7) = ?
    GROUP BY date
    ORDER BY date ASC
  `, [month]);
  res.json({ month, data: rows.map(r => ({ ...r, expense: Number(r.expense), income: Number(r.income) })) });
});

// 导出 CSV
app.get('/api/export', (req, res) => {
  const rows = queryAll('SELECT * FROM transactions ORDER BY date DESC, id DESC');
  const header = 'ID,类型,分类,金额,备注,日期\n';
  const csv = header + rows.map(r =>
    `${r.id},${r.type === 'expense' ? '支出' : '收入'},${r.category},${Number(r.amount)},${r.note || ''},${r.date}`
  ).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=ledger.csv');
  res.send('\ufeff' + csv);
});

// 启动服务
initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  记账应用已启动:  http://localhost:${PORT}\n`);
  });
});
