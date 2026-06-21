import { CarbonLog, User } from '../repositories/database.models.js';
import {
  calculateTransportEmission,
  calculateFoodEmission,
  calculateElectricityEmission,
  calculateShoppingEmission,
  calculateTotalEmission
} from '../services/calculation.service.js';
import { Op } from 'sequelize';

// Create or update carbon log for a specific date
export async function saveLog(req, res) {
  const userId = req.user.id;
  const { date, transport_distance, transport_type, meals, electricity_usage, shopping_spent } = req.validatedBody;

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    // Run deterministic emission calculations
    const transportEmission = calculateTransportEmission(transport_distance, transport_type);
    
    const foodEmission = 
      calculateFoodEmission(meals.vegetarian, 'vegetarian') +
      calculateFoodEmission(meals.chicken, 'chicken') +
      calculateFoodEmission(meals.beef, 'beef');
      
    const electricityEmission = calculateElectricityEmission(electricity_usage);

    const shoppingEmission = calculateShoppingEmission(shopping_spent || 0);
    
    const totalEmission = calculateTotalEmission(transportEmission, foodEmission, electricityEmission, shoppingEmission);

    // Find if a log for this date already exists
    let log = await CarbonLog.findOne({
      where: {
        user_id: user.id,
        date: date
      }
    });

    if (log) {
      log.transport_emission = parseFloat(transportEmission.toFixed(3));
      log.food_emission = parseFloat(foodEmission.toFixed(3));
      log.electricity_emission = parseFloat(electricityEmission.toFixed(3));
      log.shopping_emission = parseFloat(shoppingEmission.toFixed(3));
      log.total_emission = parseFloat(totalEmission.toFixed(3));
      await log.save();
    } else {
      log = await CarbonLog.create({
        user_id: user.id,
        date,
        transport_emission: parseFloat(transportEmission.toFixed(3)),
        food_emission: parseFloat(foodEmission.toFixed(3)),
        electricity_emission: parseFloat(electricityEmission.toFixed(3)),
        shopping_emission: parseFloat(shoppingEmission.toFixed(3)),
        total_emission: parseFloat(totalEmission.toFixed(3))
      });
    }

    return res.status(201).json({
      message: 'Carbon log saved successfully',
      log
    });
  } catch (error) {
    console.error('Save log error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

// Get all carbon logs with optional date range filters
export async function getLogs(req, res) {
  const userId = req.user.id;
  const { startDate, endDate } = req.query;

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    const whereClause = { user_id: user.id };

    if (startDate && endDate) {
      whereClause.date = {
        [Op.between]: [startDate, endDate]
      };
    } else if (startDate) {
      whereClause.date = {
        [Op.gte]: startDate
      };
    } else if (endDate) {
      whereClause.date = {
        [Op.lte]: endDate
      };
    }

    const logs = await CarbonLog.findAll({
      where: whereClause,
      order: [['date', 'ASC']]
    });

    return res.json(logs);
  } catch (error) {
    console.error('Get logs error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

// Delete a specific carbon log
export async function deleteLog(req, res) {
  const { id } = req.params;
  try {
    const log = await CarbonLog.findByPk(id);
    if (!log) {
      return res.status(404).json({ error: 'Not Found', message: 'Log entry not found' });
    }
    await log.destroy();
    return res.json({ message: 'Log entry deleted successfully' });
  } catch (error) {
    console.error('Delete log error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
