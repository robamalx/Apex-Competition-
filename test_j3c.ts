import { StageJ3CService } from './src/server/stageJ3CService.ts';
StageJ3CService.runAcceptanceSuite().then(console.log).catch(console.error);
