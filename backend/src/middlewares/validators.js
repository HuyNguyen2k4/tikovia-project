const { body, param, query } = require('express-validator');

// User validators
const userValidators = {
    createUser: [
        body('email').isEmail().withMessage('Invalid email address'),
        body('username').notEmpty().withMessage('Username is required'),
        body('password')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters long'),
        body('fullName').notEmpty().withMessage('Full name is required'),
        body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
        body('role')
            .optional()
            .isIn([
                'admin',
                'manager',
                'accountant',
                'picker',
                'sup_picker',
                'shipper',
                'sup_shipper',
                'seller',
            ])
            .withMessage('Invalid role'),
        body('status')
            .optional()
            .isIn(['active', 'disable', 'suspended'])
            .withMessage('Invalid status'),
    ],
    updateUser: [
        param('id').isInt().withMessage('User ID must be an integer'),
        body('email').optional().isEmail().withMessage('Invalid email address'),
        body('username').optional().notEmpty().withMessage('Username cannot be empty'),
        body('password')
            .optional()
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters long'),
        body('fullName').optional().notEmpty().withMessage('Full name cannot be empty'),
        body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
        body('role')
            .optional()
            .isIn([
                'admin',
                'manager',
                'accountant',
                'picker',
                'sup_picker',
                'shipper',
                'sup_shipper',
                'seller',
            ])
            .withMessage('Invalid role'),
        body('status')
            .optional()
            .isIn(['active', 'disable', 'suspended'])
            .withMessage('Invalid status'),
    ],
    login: [
        body('email').optional().isEmail().withMessage('Invalid email address'),
        body('username').optional().notEmpty().withMessage('Username cannot be empty'),
        body('password').notEmpty().withMessage('Password is required'),
    ],
};

// Export all validators
module.exports = {
    userValidators,
};
