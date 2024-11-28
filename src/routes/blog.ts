import { Hono } from "hono"
import { PrismaClient } from "@prisma/client/edge"
import { withAccelerate } from "@prisma/extension-accelerate"
import { verify } from "hono/jwt"
import { createBlogInput, updateBlogInput } from "@paras325/mediun-common"
import { auth } from "hono/utils/basic-auth"

export const blogRouter = new Hono<{
    Bindings: {
        DATABASE_URL: string
        JWT_SECRET: string
    },
    Variables: {
        userId: string
    }
}>()

blogRouter.use("/*", async (c, next) => {
    const authHeader = c.req.header('Authorization') || ""

    try {
        console.log("Auth header is: ", authHeader)
        const user = await verify(authHeader, c.env.JWT_SECRET)

    if(user) {
        //@ts-ignore
        c.set("userId", user.id)
        await next()
    }
    else {
        c.status(403)
        console.log("Inside catch 1")
        return c.json({
            msg: "You are not authorized"
        })
    }
    } catch (error) {
        console.log("Inside catch: ", error)
        c.status(403)
        return c.json({
            msg: "You are not authorized"
        })
    }
    
})

blogRouter.post("/", async (c) => {

    const body = await c.req.json()
    const { success } = createBlogInput.safeParse(body) 
    if(!success) {
        c.status(411)
        return c.json({
            msg: "Inputs are not valid"
        })
    }

    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL
    }).$extends(withAccelerate())

    if(!success) {
        c.status(411)
        return c.json({
            msg: "Inputs are not valid"
        })
    }

    const userId = c.get("userId")
    try {
        
        const blog = await prisma.post.create({
            data: {
                title: body.title,
                content: body.content,
                authorId: userId,
            }
        })
    
        return c.json({
            id: blog.id
        })
    } catch (error) {
        c.status(411)
        return c.json({
            error: "Error while posting the post"
        })
    }
    
})

blogRouter.get("/bulk", async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL
    }).$extends(withAccelerate())

    try {
        const blogs = await prisma.post.findMany({
            select: {
                id: true,
                title: true,
                content: true,
                published: true,
                author : {
                    select: {
                        name: true
                    }
                }
            }
        })
        
        return c.json({
            blogs
        })
    } catch (error) {
        c.status(411)
        return c.json({
            // error: "Error while fetching the posts"
            error: error
        })
    }
})

blogRouter.put("/", async (c) => {
    
    const body = await c.req.json()
    const { success } = updateBlogInput.safeParse(body) 
    if(!success) {
        c.status(411)
        return c.json({
            msg: "Inputs are not valid"
        })
    }

    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL
    }).$extends(withAccelerate())

    try {
        const blog = await prisma.post.update({
            where: {
                id: body.id,
            },
            data: body
        })
    
        return c.json({
            blog
        })
    } catch (error) {
        c.status(411)
        return c.json({
            error: "Error while updating the post"
        })
    }
})


blogRouter.get("/:id", async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL
    }).$extends(withAccelerate())

    const id = c.req.param("id")
    console.log("Id is: ", id)
    if(id) {
        try {
            const blog = await prisma.post.findFirst({
                where: {
                    id, 
                },
                select: {
                    id: true,
                    title: true,
                    content: true,
                    author: {
                        select: {
                            name: true
                        }
                    }
                }
            })
            
            return c.json({
                blog
            })
        } catch (error) {
            c.status(411)
            return c.json({
                error: "Error while fetching the post"
            })
        }
    } else {
        return c.json({
            error: "Incorrect querry parameter"
        })
    }
    
})