import { Hono } from "hono";
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from "@prisma/extension-accelerate"
import { sign } from "hono/jwt"
import { signinInput, signupInput } from "@paras325/mediun-common"


export const userRouter = new Hono<{
    Bindings: {
        DATABASE_URL: string,
        JWT_SECRET: string
    }
}>()

userRouter.get("/", (c) => {
    return c.text("Inisde users")
})

userRouter.post("/signup", async (c) => {

  const body = await c.req.json()
  const {success} = signupInput.safeParse(body)
  if(!success) {
    c.status(411)
    return c.json({
      msg: "Invalid inputs"
    })
  }

    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL
    }).$extends(withAccelerate())

    const {name, email, password} = body

    try {
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password
            }
        })

        const token = await sign({ id: user.id }, c.env.JWT_SECRET)
        return c.json({
            msg: "User created successfully",
            token
        })

    } catch (error) {
        return c.json({
            error: "Invalid Inputs or User already exist"
        })
    }
})

userRouter.post("/signin", async (c) => {

  const body = await c.req.json()
  const {success} = signinInput.safeParse(body)
  if(!success) {
    c.status(411)
    return c.json({
      msg: "Invalid inputs"
    })
  }
  
    const {email, password} = body
  
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL
    }).$extends(withAccelerate())
  
    try {
      const user = await prisma.user.findUnique({
        where: {
          email,
          password
        }
      })
    
      if(!user) {
        c.status(403)
        return c.json({
          msg: "Invalid Credentials"
        })
      }
  
      
    const token = await sign({id: user.id}, c.env.JWT_SECRET)
    return c.json({
      msg: "Login successfully",
      token
    })
  
    } catch (e) {
      c.status(411)
      return c.json({
        msg: "Something went wrong"
      })
    }
  
  })