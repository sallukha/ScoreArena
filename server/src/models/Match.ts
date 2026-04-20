import mongoose, { Schema, model } from 'mongoose';

const ScoreSchema = new Schema(
  {
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    overs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    extras: { type: Number, default: 0 },
  },
  { _id: false }
);

const FallOfWicketSchema = new Schema(
  {
    player: { type: String, required: true },
    playerName: { type: String, default: '' },
    type: { type: String, required: true },
    bowler: { type: String, default: '' },
    bowlerName: { type: String, default: '' },
    fielder: { type: String, default: '' },
    fielderName: { type: String, default: '' },
    score: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    innings: { type: Number, enum: [1, 2], required: true },
  },
  { _id: false }
);

const PerformanceSchema = new Schema(
  {
    playerId: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
    runs: { type: Number, default: 0, min: 0 },
    wickets: { type: Number, default: 0, min: 0 },
    ballsPlayed: { type: Number, default: 0, min: 0 },
    oversBowled: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const MatchSchema = new Schema(
  {
    teamA: { type: String, required: true },
    teamB: { type: String, required: true },
    tournamentId: { type: String, default: '' },
    status: { type: String, enum: ['upcoming', 'live', 'completed'], default: 'live' },
    tossWinner: { type: String, default: '' },
    tossDecision: { type: String, enum: ['bat', 'bowl', ''], default: '' },
    overs: { type: Number, required: true },
    scoreA: { type: ScoreSchema, default: () => ({}) },
    scoreB: { type: ScoreSchema, default: () => ({}) },
    currentInnings: { type: Number, enum: [1, 2], default: 1 },
    striker: { type: String, default: '' },
    strikerName: { type: String, default: '' },
    nonStriker: { type: String, default: '' },
    nonStrikerName: { type: String, default: '' },
    bowler: { type: String, default: '' },
    bowlerName: { type: String, default: '' },
    playerStats: { type: Schema.Types.Mixed, default: {} },
    fallOfWickets: { type: [FallOfWicketSchema], default: [] },
    players: [{ type: Schema.Types.ObjectId, ref: 'Player', default: [] }],
    createdBy: { type: String, required: true },
    performances: { type: [PerformanceSchema], default: [] },
    matchDate: { type: Date, default: Date.now },
    statsFinalized: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

MatchSchema.index({ status: 1, createdAt: -1 });
MatchSchema.index({ createdBy: 1, status: 1, createdAt: -1 });
MatchSchema.index({ teamA: 1, teamB: 1 });
MatchSchema.index({ tournamentId: 1, status: 1, createdAt: -1 });
MatchSchema.index({ players: 1, matchDate: -1 });
MatchSchema.index({ 'performances.playerId': 1, matchDate: -1 });

const MatchModel = mongoose.models.Match || model('Match', MatchSchema);
export default MatchModel;
