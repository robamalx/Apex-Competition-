const fs = require('fs');
let content = fs.readFileSync('src/components/CompetitionDetailsView.tsx', 'utf8');

const formatDate = (dStr) => {
  if (!dStr) return 'TBA';
  const d = new Date(dStr);
  if (isNaN(d.getTime())) return 'TBA';
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Nairobi',
    timeZoneName: 'short'
  });
};

const insertionPoint = `        {/* Stats Grid */}`;

const scheduleBlock = `
        {/* COMPETITION SCHEDULE & STATUS */}
        <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-5 mb-4 shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <h3 className="font-extrabold text-sm text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Competition Schedule
            </h3>
            <span className={\`px-3 py-1 rounded-md text-xs font-black uppercase tracking-widest border \${
              competition.status === 'LOCKED' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
              competition.status === 'LIVE' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse' :
              ['SETTLING', 'SETTLED', 'COMPLETED', 'FINISHED'].includes(competition.status) ? 'bg-slate-800 text-slate-400 border-slate-700' :
              'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }\`}>
              STATUS: {competition.status}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left">
            <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Starts</span>
              <span className="text-xs font-semibold text-slate-200">
                {competition.startDate ? new Date(competition.startDate).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' EAT' : 'TBA'}
              </span>
            </div>
            <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Prediction Lock</span>
              <span className="text-xs font-semibold text-amber-400">
                {competition.registrationDeadline ? new Date(competition.registrationDeadline).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' EAT' : 'TBA'}
              </span>
            </div>
            <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Ends (Est)</span>
              <span className="text-xs font-semibold text-slate-200">
                {competition.endDate ? new Date(competition.endDate).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' EAT' : 'TBA'}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}`;

content = content.replace(insertionPoint, scheduleBlock);

fs.writeFileSync('src/components/CompetitionDetailsView.tsx', content);
console.log("Updated CompetitionDetailsView");
