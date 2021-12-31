import 'reflect-metadata'
import {
  Resolver,
  Query,
  Mutation,
  Args,
  Context,
  ResolveField,
  Root,
  InputType,
  Field,
} from '@nestjs/graphql'
import { Inject } from '@nestjs/common'
import { PrismaService } from '../prisma.service'

import { Root as Home } from '../models/root.model'
import { Level1 } from '../models/level1.model'

// @InputType()
// class MediaUniqueInput {
//   @Field({ nullable: true })
//   id: string

//   @Field({ nullable: true })
//   name: string
// }

@Resolver(Home)
export class RootResolver {
  constructor(@Inject(PrismaService) private prismaService: PrismaService) { }

  @Query(() => Home, { name: 'root' })
  async getSelf(@Args('id', { type: () => String }) id: string) {
    return this.prismaService.root.findUnique(
      {
        where: {
          id: id
        }
      }
    );
  }

  @ResolveField('children', () => [Level1])
  async getChildren(@Root() root: Home) {
    return this.prismaService.level1.findMany({
      where: {
        pid: root.id
      }
    });
  }

}












  // @InputType()
  // class MediaCreateInput {
  //   @Field()
  //   name: string

  //   @Field({ nullable: true })
  //   qm: string

  //   @Field((type) => [CategoryCreateInput])
  //   categories: [CategoryCreateInput]
  // }




  // @Mutation((returns) => User)
  // async signupUser(
  //   @Args('data') data: UserCreateInput,
  //   @Context() ctx,
  // ): Promise<User> {
  //   const postData = data.posts?.map((post) => {
  //     return { title: post.title, content: post.content || undefined }
  //   })

  //   return this.prismaService.user.create({
  //     data: {
  //       email: data.email,
  //       name: data.name,
  //       posts: {
  //         create: postData
  //       }
  //     },
  //   })
  // }

  //   @Query((returns) => Media, { nullable: true })
  //   async allMedias(@Context() ctx) {
  //     return this.prismaService.media.findMany(

  //     )
  //   }

  //   @Query((returns) => [Category], { nullable: true })
  //   async searchByMedia(@Args('mediaUniqueInput') mediaUniqueInput: MediaUniqueInput): Promise<Category[]> {
  //     return this.prismaService.media.findUnique({
  //       where: {
  //         id: mediaUniqueInput.id || undefined,
  //         name: mediaUniqueInput.name || undefined
  //       }
  //     }).categories()
  //   }
  // }

  // @InputType()
  // class UserUniqueInput {
  //   @Field({ nullable: true })
  //   id: number

  //   @Field({ nullable: true })
  //   email: string
  // }

  // @InputType()
  // class UserCreateInput {
  //   @Field()
  //   email: string

  //   @Field({ nullable: true })
  //   name: string

  //   @Field((type) => [PostCreateInput], { nullable: true })
  //   posts: [PostCreateInput]
  // }

  // @Resolver(User)
  // export class UserResolver {
  //   constructor(@Inject(PrismaService) private prismaService: PrismaService) { }

  //   @ResolveField()
  //   async posts(@Root() user: User, @Context() ctx): Promise<Post[]> {
  //     return this.prismaService.user
  //       .findUnique({
  //         where: {
  //           id: user.id,
  //         },
  //       })
  //       .posts()
  //   }

  //   @Mutation((returns) => User)
  //   async signupUser(
  //     @Args('data') data: UserCreateInput,
  //     @Context() ctx,
  //   ): Promise<User> {
  //     const postData = data.posts?.map((post) => {
  //       return { title: post.title, content: post.content || undefined }
  //     })

  //     return this.prismaService.user.create({
  //       data: {
  //         email: data.email,
  //         name: data.name,
  //         posts: {
  //           create: postData
  //         }
  //       },
  //     })
  //   }

  //   @Query((returns) => User, { nullable: true })
  //   async allUsers(@Context() ctx) {
  //     return this.prismaService.user.findMany()
  //   }

  //   @Query((returns) => [Post], { nullable: true })
  //   async draftsByUser(@Args('userUniqueInput') userUniqueInput: UserUniqueInput): Promise<Post[]> {
  //     return this.prismaService.user.findUnique({
  //       where: {
  //         id: userUniqueInput.id || undefined,
  //         email: userUniqueInput.email || undefined
  //       }
  //     }).posts({
  //       where: {
  //         published: false
  //       }
  //     })
  //   }
// }

