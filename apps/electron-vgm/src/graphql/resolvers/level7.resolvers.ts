import 'reflect-metadata'
import {
	Resolver,
	Query,
	Mutation,
	Args,
	ResolveField,
	Root,
	Context,
	Int,
	InputType,
	Field,
	Float
} from '@nestjs/graphql'
import { PrismaService } from '../prisma.service'
import { Inject } from '@nestjs/common'

import { Level6 } from '../models/level6.model'
import { Level7 } from '../models/level7.model'


@InputType()
export class Level7UpdateInput {

	@Field((type) => String)
	id: string

	@Field((type) => Boolean, { nullable: true })
	isLeaf?: boolean

	@Field((type) => Int, { nullable: true })
	count?: number

	@Field((type) => String, { nullable: true })
	md5?: string

	@Field((type) => String, { nullable: true })
	url?: string

	@Field((type) => String, { nullable: true })
	name?: string

	@Field((type) => String, { nullable: true })
	keyword?: string

	@Field((type) => String, { nullable: true })
	hash?: string

	@Field((type) => String, { nullable: true })
	khash?: string

	@Field((type) => String, { nullable: true })
	qm?: string

	@Field((type) => Int, { nullable: true })
	audience?: number

	@Field((type) => Int, { nullable: true })
	mtime?: number

	@Field((type) => Int, { nullable: true })
	viewCount?: number

}
@InputType()
export class Level7CreateInput {

	@Field((type) => String)
	pid: string

	@Field((type) => Boolean, { nullable: true })
	isLeaf: boolean

	@Field((type) => String, { nullable: true })
	md5: string

	@Field((type) => String)
	url: string

	@Field((type) => Boolean)
	isVideo: boolean

	@Field((type) => String)
	name: string

	@Field((type) => Int, { nullable: true })
	count?: number

	@Field((type) => String, { nullable: true })
	keyword?: string

	@Field((type) => String, { nullable: true })
	thumb?: string

	@Field((type) => String, { nullable: true })
	qm?: string

	@Field((type) => String, { nullable: true })
	hash?: string

	@Field((type) => String, { nullable: true })
	khash?: string

	@Field((type) => Int, { nullable: true })
	audience?: number

	@Field((type) => Int, { nullable: true })
	mtime?: number

	@Field((type) => Int, { nullable: true })
	viewCount?: number

	@Field((type) => String, { nullable: true })
	duration?: string

	@Field((type) => Float, { nullable: true })
	size?: number
}

// @InputType()
// class PostOrderByUpdatedAtInput {
//   @Field((type) => SortOrder)
//   updatedAt: SortOrder
// }

// enum SortOrder {
//   asc = 'asc',
//   desc = 'desc'
// }

// registerEnumType(SortOrder, {
//   name: 'SortOrder'
// })



@Resolver(Level7)
export class Level7Resolver {
	constructor(@Inject(PrismaService) private prismaService: PrismaService) { }

	@Query(() => Level7, { name: 'level7Unique' })
	async getSelf(@Args('id', { type: () => String }) id: string) {
		return this.prismaService.level7.findUnique({
			where: {
				id: id
			}
		});
	}

	@ResolveField('parent', () => [Level6])
	async getParent(@Root() level7: Level7) {
		return this.prismaService.level6.findUnique({
			where: {
				id: level7.pid,
			},
		})
	}

	@Query((returns) => [Level7])
	level7Queries(
		@Args('isVideo', { nullable: true }) isVideo: boolean,
		@Args('isLeaf', { nullable: true }) isLeaf: boolean,
		@Args('id', { nullable: true }) id: string,
		@Args('url', { nullable: true }) url: string,
		@Context() ctx) {
		// const or = isVideo
		//   ? {
		//     OR: [{
		//       isVideo: isVideo,
		//       isLeaf: isLeaf,
		//       id: id
		//     }],
		//   } : {}
		return this.prismaService.level7.findMany({
			where: {
				isVideo: isVideo,
				isLeaf: isLeaf,
				id: id,
				url: url
			},
		})
	}

	@Mutation((returns) => Level7)
	createLevel7(
		@Args('data') data: Level7CreateInput,
		@Context() ctx,
	) {
		return this.prismaService.level7.create({
			data: {
				isLeaf: data.isLeaf,
				md5: data.md5,
				url: data.url,
				isVideo: data.isVideo,
				name: data.name,
				count: data.count,
				keyword: data.keyword,
				thumb: data.thumb,
				qm: data.qm,
				khash: data.khash,
				audience: data.audience,
				mtime: data.mtime,
				viewCount: data.viewCount,
				duration: data.duration,
				size: data.size,
				parent: {
					connect: {
						id: data.pid
					}
				}
			},
		})
	}


	@Mutation((returns) => Level7)
	updateLevel7(
		@Args('data') data: Level7UpdateInput,
		@Context() ctx,
	) {
		return this.prismaService.level7.update({
			where: {
				id: data.id
			},
			data: {
				isLeaf: data.isLeaf,
				count: data.count,
				md5: data.md5,
				name: data.name,
				url: data.url,
				keyword: data.keyword,
				hash: data.hash,
				khash: data.khash,
				qm: data.qm,
				audience: data.audience,
				mtime: data.mtime,
				viewCount: data.viewCount
			},
		})
	}

	@Mutation((returns) => Level7)
	deleteLevel7(
		@Args('id') id: string
	) {
		return this.prismaService.level7.delete({
			where: {
				id: id
			}
		})
	}
	// @ResolveField('children', () => [Level8])
	// async getChildren(@Root() level7: Level7) {
	//   return this.prismaService.level8.findMany({
	//     where: {
	//       pid: level7.id
	//     }
	//   });
	// }




	//   @ResolveField('topic', () => [Topic])
	//   async getParent(@Root() content: Content){
	//     return this.prismaService.topic
	//       .findMany({
	//         where: {
	//           id: content.pid,
	//         },
	//       })
	//   }


	//   // @Query((returns) => Post, { nullable: true })
	//   // postById(@Args('id') id: number) {
	//   //   return this.prismaService.post.findUnique({
	//   //     where: { id },
	//   //   })
	//   // }

	//   @Query((returns) => [Content])
	//   video(
	//     @Args('searchVideo', { nullable: true }) searchVideo: string,
	//     @Args('skip', { nullable: true }) skip: number,
	//     @Args('take', { nullable: true }) take: number,
	//     @Args('orderBy', { nullable: true }) orderBy: PostOrderByUpdatedAtInput,
	//     @Context() ctx) {

	//     const or = searchVideo
	//       ? {
	//         OR: [
	//           { name: { contains: searchVideo } }
	//         ],
	//       }
	//       : {}

	//     return this.prismaService.content.findMany({
	//       where: {
	//          filetype: { contains: 'video' },
	//         ...or,
	//       },
	//       take: take || undefined,
	//       skip: skip || undefined,
	//       orderBy: orderBy || undefined,
	//     })
	//   }


	//   @Query((returns) => [Content])
	//   audio(
	//     @Args('searchAudio', { nullable: true }) searchAudio: string,
	//     @Args('skip', { nullable: true }) skip: number,
	//     @Args('take', { nullable: true }) take: number,
	//     @Args('orderBy', { nullable: true }) orderBy: PostOrderByUpdatedAtInput,
	//     @Context() ctx) {

	//     const or = searchAudio
	//       ? {
	//         OR: [
	//           { name: { contains: searchAudio } }
	//         ],
	//       }
	//       : {}

	//     return this.prismaService.content.findMany({
	//       where: {
	//         filetype: { contains: 'audio' } ,
	//         ...or,
	//       },
	//       take: take || undefined,
	//       skip: skip || undefined,
	//       orderBy: orderBy || undefined,
	//     })
	//   }




	//     @Mutation((returns) => Content, { nullable: true })
	//     async deleteContent(
	//       @Args('id') id: string,
	//       @Context() ctx,
	//     ) {
	//       return this.prismaService.content.delete({
	//         where: {
	//           id: id,
	//         },
	//       })
	//     }

	//   // @Mutation(returns => Post)
	//   // incrementPostViewCount(
	//   //   @Args('id') id: number
	//   // ): Promise<Post> {
	//   //   return this.prismaService.post.update({
	//   //     where: { id },
	//   //     data: {
	//   //       viewCount: {
	//   //         increment: 1
	//   //       }
	//   //     }
	//   //   })
	//   // }

	//   // @Mutation((returns) => Post, { nullable: true })
	//   // async togglePublishPost(@Args('id') id: number): Promise<Post | null> {
	//   //   const post = await this.prismaService.post.findUnique({
	//   //     where: { id: id || undefined },
	//   //     select: {
	//   //       published: true,
	//   //     },
	//   //   })

	//   //   return this.prismaService.post.update({
	//   //     where: { id: id || undefined },
	//   //     data: { published: !post?.published },
	//   //   })
	//   // }

	//   // @Mutation((returns) => Post, { nullable: true })
	//   // async deletePost(
	//   //   @Args('id') id: number,
	//   //   @Context() ctx,
	//   // ): Promise<Post | null> {
	//   //   return this.prismaService.post.delete({
	//   //     where: {
	//   //       id: id,
	//   //     },
	//   //   })
	//   // }
	// }


	// // @Resolver(Post)
	// // export class CategoryResolver {
	// //   constructor(@Inject(PrismaService) private prismaService: PrismaService) { }

	// //   @ResolveField()
	// //   author(@Root() post: Post): Promise<User | null> {
	// //     return this.prismaService.post
	// //       .findUnique({
	// //         where: {
	// //           id: post.id,
	// //         },
	// //       })
	// //       .author()
	// //   }

	// //   @Query((returns) => Post, { nullable: true })
	// //   postById(@Args('id') id: number) {
	// //     return this.prismaService.post.findUnique({
	// //       where: { id },
	// //     })
	// //   }

	// //   @Query((returns) => [Post])
	// //   feed(
	// //     @Args('searchString', { nullable: true }) searchString: string,
	// //     @Args('skip', { nullable: true }) skip: number,
	// //     @Args('take', { nullable: true }) take: number,
	// //     @Args('orderBy', { nullable: true }) orderBy: PostOrderByUpdatedAtInput,
	// //     @Context() ctx) {

	// //     const or = searchString
	// //       ? {
	// //         OR: [
	// //           { title: { contains: searchString } },
	// //           { content: { contains: searchString } },
	// //         ],
	// //       }
	// //       : {}

	// //     return this.prismaService.post.findMany({
	// //       where: {
	// //         published: true,
	// //         ...or,
	// //       },
	// //       take: take || undefined,
	// //       skip: skip || undefined,
	// //       orderBy: orderBy || undefined,
	// //     })
	// //   }

	// //   @Mutation((returns) => Post)
	// //   createDraft(
	// //     @Args('data') data: PostCreateInput,
	// //     @Args('authorEmail') authorEmail: string,
	// //     @Context() ctx,
	// //   ): Promise<Post> {
	// //     return this.prismaService.post.create({
	// //       data: {
	// //         title: data.title,
	// //         content: data.content,
	// //         author: {
	// //           connect: { email: authorEmail },
	// //         },
	// //       },
	// //     })
	// //   }

	// //   @Mutation(returns => Post)
	// //   incrementPostViewCount(
	// //     @Args('id') id: number
	// //   ): Promise<Post> {
	// //     return this.prismaService.post.update({
	// //       where: { id },
	// //       data: {
	// //         viewCount: {
	// //           increment: 1
	// //         }
	// //       }
	// //     })
	// //   }

	// //   @Mutation((returns) => Post, { nullable: true })
	// //   async togglePublishPost(@Args('id') id: number): Promise<Post | null> {
	// //     const post = await this.prismaService.post.findUnique({
	// //       where: { id: id || undefined },
	// //       select: {
	// //         published: true,
	// //       },
	// //     })

	// //     return this.prismaService.post.update({
	// //       where: { id: id || undefined },
	// //       data: { published: !post?.published },
	// //     })
	// //   }

	// //   @Mutation((returns) => Post, { nullable: true })
	// //   async deletePost(
	// //     @Args('id') id: number,
	// //     @Context() ctx,
	// //   ): Promise<Post | null> {
	// //     return this.prismaService.post.delete({
	// //       where: {
	// //         id: id,
	// //       },
	// //     })
	// //   }
}
