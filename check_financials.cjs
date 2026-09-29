const fs = require('fs');
const db = JSON.parse(fs.readFileSync('data/database.json'));

let stats = {
  users: 0,
  deposits: 0,
  withdrawals: 0,
  otherTxs: 0,
  totalDeposits: 0,
  totalWithdrawals: 0
};

stats.users = db.users.length;
db.transactions.forEach(t => {
  if (t.type === 'DEPOSIT') {
    stats.deposits++;
    stats.totalDeposits += t.amountETB;
  } else if (t.type === 'WITHDRAWAL') {
    stats.withdrawals++;
    stats.totalWithdrawals += t.amountETB;
  } else {
    stats.otherTxs++;
  }
});

console.log(stats);

db.users.forEach(u => {
  let expected = 0;
  db.transactions.filter(t => t.userId === u.id && t.status === 'COMPLETED').forEach(t => {
    if (t.direction === 'CREDIT') expected += t.amountETB;
    if (t.direction === 'DEBIT') expected -= t.amountETB;
  });
  if (u.balanceETB !== expected) {
    console.log(`User ${u.id} balance mismatch! DB: ${u.balanceETB}, Ledger: ${expected}`);
  }
});
