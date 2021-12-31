import 'reflect-metadata'
import { ObjectType, Field, Int, Float } from '@nestjs/graphql'
import { Level6 } from './level6.model'
// import { Level8 } from './level8.model'

@ObjectType()
export class Level7 {
  @Field((type) => String)
  id: string

  @Field((type) => String)
  pid: string

  @Field((type) => Int)
  dblevel: number

  @Field((type) => Date)
  createdAt: Date

  @Field((type) => Date)
  updatedAt: Date

  @Field((type) => Boolean, { nullable: true })
  isLeaf: boolean

  @Field((type) => String)
  location: string

  @Field((type) => String)
  url: string

  @Field((type) => Boolean)
  isVideo: boolean

  @Field((type) => String)
  name: string

  @Field((type) => Int)
  count: number

  @Field((type) => String, { nullable: true })
  keyword?: string

  @Field((type) => String, { nullable: true })
  thumb?: string

  @Field((type) => String, { nullable: true })
  qm?: string

  @Field((type) => String, { nullable: true })
  hash?: string

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

  @Field((type) => [Level6])
  parent: [Level6]

  // @Field((type) => [Level8], { nullable: true })
  // children?: [Level8] | null
}
