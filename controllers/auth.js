const User = require("../models/users")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const axios = require("axios") // You'll need to install: npm install axios

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" })
}

// CAPTCHA verification utility
const verifyCaptcha = async (captchaResponse, expectedAction = null) => {
  try {
    if (!process.env.RECAPTCHA_SECRET_KEY) {
      console.error('RECAPTCHA_SECRET_KEY is not set in environment variables')
      return { 
        success: false, 
        error: 'Server configuration error - CAPTCHA not configured' 
      }
    }

    if (!captchaResponse) {
      return { 
        success: false, 
        error: 'CAPTCHA response is required' 
      }
    }

    // Make request to Google's verification endpoint
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captchaResponse}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000 // 10 second timeout
      }
    )

    const data = response.data

    // Log for debugging (remove in production)
    console.log('CAPTCHA verification result:', {
      success: data.success,
      score: data.score,
      action: data.action,
      hostname: data.hostname,
      timestamp: data.challenge_ts,
      errors: data['error-codes']
    })

    // Check if verification was successful
    if (!data.success) {
      const errorMessages = {
        'missing-input-secret': 'The secret parameter is missing',
        'invalid-input-secret': 'The secret parameter is invalid or malformed',
        'missing-input-response': 'The response parameter is missing',
        'invalid-input-response': 'The response parameter is invalid or malformed',
        'bad-request': 'The request is invalid or malformed',
        'timeout-or-duplicate': 'The response is no longer valid: either is too old or has been used previously'
      }

      const errorCodes = data['error-codes'] || []
      const errorMessage = errorCodes.map(code => errorMessages[code] || code).join(', ')
      
      return {
        success: false,
        error: `CAPTCHA verification failed: ${errorMessage}`,
        errorCodes
      }
    }

    // For reCAPTCHA v3, check score (if present)
    // For reCAPTCHA v3, check score/action
    if (data.score !== undefined) {
    const minScore = 0.5
    if (data.score < minScore) {
        return {
        success: false,
        error: `CAPTCHA score too low: ${data.score} (minimum: ${minScore})`,
        score: data.score
        }
    }
    }

    if (expectedAction && data.action !== expectedAction) {
    return {
        success: false,
        error: `CAPTCHA action mismatch: expected '${expectedAction}', got '${data.action}'`,
        action: data.action
    }
    }


    // Verification successful
    return {
      success: true,
      score: data.score,
      action: data.action,
      hostname: data.hostname,
      timestamp: data.challenge_ts
    }

  } catch (error) {
    console.error('CAPTCHA verification error:', error.message)
    
    if (error.code === 'ECONNABORTED') {
      return { 
        success: false, 
        error: 'CAPTCHA verification timeout - please try again' 
      }
    }
    
    if (error.response) {
      return { 
        success: false, 
        error: `CAPTCHA verification failed - server error: ${error.response.status}` 
      }
    }
    
    return { 
      success: false, 
      error: 'CAPTCHA verification failed - network error' 
    }
  }
}

// Input validation helper
const validateInput = (email, password) => {
  const errors = []

  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    errors.push('Email is required')
  } else {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      errors.push('Please provide a valid email address')
    }
  }

  if (!password || typeof password !== 'string') {
    errors.push('Password is required')
  } else if (password.length < 6) {
    errors.push('Password must be at least 6 characters long')
  }

  return errors
}

// @desc Register user
exports.registerUser = async (req, res) => {
  try {
    const { email, password, captcha } = req.body
    const captchaResult = await verifyCaptcha(captcha)

    // Validate CAPTCHA for registration (optional, but recommended)
    if (!captchaResult.success) {
        return res.status(400).json({
        success: false,
        error: captchaResult.error || 'CAPTCHA verification failed'
        })
    }

    // Validate input
    const validationErrors = validateInput(email, password)
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        success: false,
        error: validationErrors.join('. ') 
      })
    }

    // Check if user already exists
    const normalizedEmail = email.trim().toLowerCase()
    const userExists = await User.findOne({ email: normalizedEmail })
    if (userExists) {
      return res.status(400).json({ 
        success: false,
        error: "User with this email already exists" 
      })
    }

    // Hash password
    const salt = await bcrypt.genSalt(12) // Increased salt rounds for better security
    const hashedPassword = await bcrypt.hash(password, salt)

    // Create user
    const user = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
    })

    // Generate token
    const token = generateToken(user._id)

    console.log(`User registered successfully: ${normalizedEmail}`)

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        email: user.email,
        createdAt: user.createdAt
      }
    })
  } catch (err) {
    console.error('Registration error:', err)
    res.status(500).json({ 
      success: false,
      error: "Internal server error. Please try again later." 
    })
  }
}

// @desc Login user
exports.loginUser = async (req, res) => {
  try {
    const { email, password, captcha } = req.body

    // Validate input
    const validationErrors = validateInput(email, password)
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        success: false,
        error: validationErrors.join('. ') 
      })
    }

    // Verify CAPTCHA (required for login)
    if (!captcha) {
      return res.status(400).json({ 
        success: false,
        error: "CAPTCHA verification is required" 
      })
    }

    const captchaResult = await verifyCaptcha(captcha)
    if (!captchaResult.success) {
      console.log('CAPTCHA verification failed for login attempt:', {
        email: email?.trim()?.toLowerCase(),
        error: captchaResult.error,
        ip: req.ip || req.connection.remoteAddress
      })
      
      return res.status(400).json({ 
        success: false,
        error: captchaResult.error || 'CAPTCHA verification failed. Please try again.' 
      })
    }

    console.log('CAPTCHA verification successful for login attempt')

    // Find user
    const normalizedEmail = email.trim().toLowerCase()
    const user = await User.findOne({ email: normalizedEmail })
    if (!user) {
      // Log failed login attempt (don't specify if email exists)
      console.log(`Failed login attempt - user not found: ${normalizedEmail}`)
      return res.status(401).json({ 
        success: false,
        error: "Invalid email or password" 
      })
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      // Log failed login attempt
      console.log(`Failed login attempt - wrong password: ${normalizedEmail}`)
      return res.status(401).json({ 
        success: false,
        error: "Invalid email or password" 
      })
    }

    // Generate token
    const token = generateToken(user._id)

    // Log successful login
    console.log(`User logged in successfully: ${normalizedEmail}`)

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        createdAt: user.createdAt
      }
    })

  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ 
      success: false,
      error: "Internal server error. Please try again later." 
    })
  }
}

// @desc Get user profile (protected)
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password")
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: "User not found" 
      })
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    })
  } catch (err) {
    console.error('Profile fetch error:', err)
    res.status(500).json({ 
      success: false,
      error: "Internal server error" 
    })
  }
}

// @desc Refresh token
exports.refreshToken = async (req, res) => {
  try {
    const { token } = req.body

    if (!token) {
      return res.status(400).json({ 
        success: false,
        error: "Token is required" 
      })
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    // Find user
    const user = await User.findById(decoded.id).select("-password")
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: "User not found" 
      })
    }

    // Generate new token
    const newToken = generateToken(user._id)

    res.json({
      success: true,
      message: "Token refreshed successfully",
      token: newToken
    })

  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        error: "Invalid token" 
      })
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        error: "Token expired" 
      })
    }

    console.error('Token refresh error:', err)
    res.status(500).json({ 
      success: false,
      error: "Internal server error" 
    })
  }
}