import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ChatbotService } from './chatbot.service';
import { AskChatbotDto } from './dto/ask-chatbot.dto';
import { OptionalJwtGuard } from '../../common/guards/optional-jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

const CHAT_THROTTLE = { default: { limit: 20, ttl: 60000 } } as const;

@ApiTags('Chatbot (AI)')
@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Throttle(CHAT_THROTTLE)
  @Post('ask')
  @UseGuards(OptionalJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Hỏi trợ lý AI PhoneShop (Gemini Flash, grounding catalog+FAQ)' })
  ask(@Body() dto: AskChatbotDto, @CurrentUser() user: any) {
    return this.chatbotService.ask(dto, user || null);
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Gợi ý câu hỏi nhanh cho widget AI' })
  suggestions() {
    return { suggestions: this.chatbotService.getSuggestions() };
  }
}
