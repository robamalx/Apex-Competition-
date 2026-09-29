const fs = require('fs');
const db = JSON.parse(fs.readFileSync('data/database.json'));

let oldDeposits = 0;
let oldWithdrawals = 0;

db.transactions = db.transactions.filter(t => {
  if (t.type === 'DEPOSIT') { oldDeposits++; return false; }
  if (t.type === 'WITHDRAWAL') { oldWithdrawals++; return false; }
  return true;
});

db.users.forEach(u => {
  let expected = 0;
  db.transactions.filter(t => t.userId === u.id && t.status === 'COMPLETED').forEach(t => {
    if (t.direction === 'CREDIT') expected += t.amountETB;
    if (t.direction === 'DEBIT') expected -= t.amountETB;
  });
  u.balanceETB = expected;
});

fs.writeFileSync('data/database.json', JSON.stringify(db, null, 2));
console.log(`Deleted ${oldDeposits} deposits and ${oldWithdrawals} withdrawals. Balances updated.`);
