import { User } from "../models/user.model.js";
import { APIError } from "../utils/APIError.js";
import { AsyncHandler } from "../utils/AsyncHandler.js";
import jwt from 'jsonwebtoken';

const Authenticate = AsyncHandler(async(req, res, next)=>{
    try {
        const token = req.cookies?.accessToken || req.headers('Authorization')?.replace('Bearer ', '')
        if(!token){
            // throw new APIError(400, 'Unauthorized request')
            let warning = 'Unauthorized request'
            req.authWarning = warning
            req.auth = false
            next()
        }
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        
        const user = await User.findById(decodedToken._id).select(
            '-password -role -refreshToken'
        )

        if(!user){
            // throw new APIError('Invalid token.')
            let warning = 'Invalid token.'
            req.authWarning = warning
            req.auth = false
            next()
        }

        req.auth = true
        req.user = user
        next()
    } catch (error) {
        let warning = 'Unauthorized request'
        req.authWarning = warning
        req.auth = false
        next()
    }
})

export { Authenticate }