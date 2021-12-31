import { Module } from '@nestjs/common'
import { GraphQLModule } from '@nestjs/graphql'
import { PrismaService } from './prisma.service'

import { RootResolver } from './resolvers/root.resolvers'
import { Level1Resolver } from './resolvers/level1.resolvers'
import { Level2Resolver } from './resolvers/level2.resolvers'
import { Level3Resolver } from './resolvers/level3.resolvers'
import { Level4Resolver } from './resolvers/level4.resolvers'
import { Level5Resolver } from './resolvers/level5.resolvers'
import { Level6Resolver } from './resolvers/level6.resolvers'
import { Level7Resolver } from './resolvers/level7.resolvers'

import { join } from 'path'

@Module({
  imports: [
    GraphQLModule.forRoot({
      autoSchemaFile: join(process.cwd(), 'apps/electron-vgm/src/graphql/schema.gql')
    })
  ],
  controllers: [],
  providers: [
    PrismaService,
    RootResolver,
    Level1Resolver,
    Level2Resolver,
    Level3Resolver,
    Level4Resolver,
    Level5Resolver,
    Level6Resolver,
    Level7Resolver,
  ],
})
export class AppModule { }
