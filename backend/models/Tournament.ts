import mongoose, { Schema, model } from 'mongoose';

const TournamentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    organizer: { type: String, default: '' },
    city: { type: String, default: '' },
    startDate: { type: String, default: '' },
    endDate: { type: String, default: '' },
    status: { type: String, enum: ['upcoming', 'live', 'completed'], default: 'upcoming' },
    format: { type: String, default: 'League' },
    overs: { type: Number, default: 20 },
    description: { type: String, default: '' },
    teams: { type: [String], default: [] },
    teamCount: { type: Number, default: 0 },
    playerCount: { type: Number, default: 0 },
    createdBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true, versionKey: false }
);

TournamentSchema.index({ createdBy: 1, createdAt: -1 });

export const TournamentModel = mongoose.models.Tournament || model('Tournament', TournamentSchema);
