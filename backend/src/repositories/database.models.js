import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

export const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  }
}, {
  tableName: 'Users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export const Profile = sequelize.define('Profile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  transport_type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  daily_distance: {
    type: DataTypes.FLOAT, // average daily commute distance
    allowNull: false,
  },
  diet_type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  household_size: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  electricity_usage: {
    type: DataTypes.FLOAT, // monthly electricity consumption estimate
    allowNull: false,
  },
  weekly_commute_frequency: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  meals_per_day: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 3,
  },
  ai_usage_frequency: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  video_streaming_usage: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0,
  },
  sustainability_goal: {
    type: DataTypes.STRING,
    allowNull: true,
  }
}, {
  tableName: 'Profiles',
  timestamps: false,
});

export const CarbonLog = sequelize.define('CarbonLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  date: {
    type: DataTypes.DATEONLY, // store as YYYY-MM-DD
    allowNull: false,
  },
  transport_emission: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  food_emission: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  electricity_emission: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  shopping_emission: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  total_emission: {
    type: DataTypes.FLOAT,
    allowNull: false,
  }
}, {
  tableName: 'CarbonLogs',
  timestamps: false,
});

export const Goal = sequelize.define('Goal', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  monthly_target: {
    type: DataTypes.FLOAT,
    allowNull: false,
  }
}, {
  tableName: 'Goals',
  timestamps: false,
});

// Associations
User.hasOne(Profile, { foreignKey: 'user_id', as: 'profile', onDelete: 'CASCADE' });
Profile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(CarbonLog, { foreignKey: 'user_id', as: 'logs', onDelete: 'CASCADE' });
CarbonLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Goal, { foreignKey: 'user_id', as: 'goals', onDelete: 'CASCADE' });
Goal.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export const JourneyHistory = sequelize.define('JourneyHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  origin: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  destination: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  distanceKm: {
    type: DataTypes.FLOAT,
    allowNull: false,
    field: 'distance_km',
  },
  selectedMode: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'selected_mode',
  },
  estimatedEmission: {
    type: DataTypes.FLOAT,
    allowNull: false,
    field: 'estimated_emission',
  }
}, {
  tableName: 'JourneyHistories',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

User.hasMany(JourneyHistory, { foreignKey: 'user_id', as: 'journeys', onDelete: 'CASCADE' });
JourneyHistory.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export const Receipt = sequelize.define('Receipt', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  extracted_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  extracted_distance: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  extracted_cost: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  extracted_mode: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'pending',
  }
}, {
  tableName: 'Receipts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

User.hasMany(Receipt, { foreignKey: 'user_id', as: 'receipts', onDelete: 'CASCADE' });
Receipt.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

