import { Controller, Get, Param, Query } from '@nestjs/common';
import { NewsService } from './news.service';

@Controller('school/news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

 @Get('news/:category')
async getNews(
  @Param('category') category: 'education' | 'sports',
  @Query('lang') lang: 'en' | 'ta' = 'en',
) {
  return this.newsService.fetchNews(category, lang);
}

}