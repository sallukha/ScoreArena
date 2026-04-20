import mongoose, { Schema, model, Model, Document } from 'mongoose';

export interface ITeam extends Document {
  name: string;
  logo?: string;
  players: mongoose.Types.ObjectId[];
  captainId?: mongoose.Types.ObjectId;
  createdBy: string;
  createdAt: Date;
}

const TeamSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    logo: { type: String, default: '' },
    players: [{ type: Schema.Types.ObjectId, ref: 'Player', default: [] }],
    captainId: { type: Schema.Types.ObjectId, ref: 'Player', default: null },
    createdBy: { type: String, required: true },
  },
  { timestamps: true, versionKey: false }
);

TeamSchema.index({ createdBy: 1, createdAt: -1 });
TeamSchema.index({ players: 1 });

const TeamModel = (mongoose.models.Team as Model<ITeam>) || model<ITeam>('Team', TeamSchema);
export default TeamModel;
