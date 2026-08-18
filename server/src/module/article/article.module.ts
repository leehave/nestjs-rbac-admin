import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArticleService } from './article.service';
import { ArticleController } from './article.controller';
import { ArticleEntity } from './entities/article.entity';
import { ArticleCategoryService } from './category/article-category.service';
import { ArticleCategoryController } from './category/article-category.controller';
import { ArticleCategoryEntity } from './category/entities/article-category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ArticleEntity, ArticleCategoryEntity])],
  controllers: [ArticleController, ArticleCategoryController],
  providers: [ArticleService, ArticleCategoryService],
})
export class ArticleModule {}
