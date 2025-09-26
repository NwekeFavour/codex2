const User = require("../models/users")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" })
}

// @desc Register user
exports.registerUser = async (req, res) => {
  try {
    const { email, password } = req.body

    if ( !email || !password) {
      return res.status(400).json({ error: "Please fill all fields" })
    }

    const userExists = await User.findOne({ email })
    if (userExists) {
      return res.status(400).json({ error: "User already exists" })
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const user = await User.create({
      email,
      password: hashedPassword,
    })

    res.status(201).json({
      message: "User registered successfully",
      token: generateToken(user._id),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// @desc Login user
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })
    if (!user) return res.status(400).json({ error: "Invalid credentials" })

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" })

    res.json({
      message: "Login successful",
      token: generateToken(user._id),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// @desc Get user profile (protected)
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password")
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
