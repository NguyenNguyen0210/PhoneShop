import { Body, Controller, Get, Post, Query, Sse, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Observable } from 'rxjs';
import { ChatbotService, StreamEvent } from './chatbot.service';
import { AskChatbotDto } from './dto/ask-chatbot.dto';
import { OptionalJwtGuard } from '../../common/guards/optional-jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

const CHAT_THROTTLE = { default: { limit: 60, ttl: 60000 } } as const;

@ApiTags('Chatbot (AI)')
@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Throttle(CHAT_THROTTLE)
  @Post('ask')
  @UseGuards(OptionalJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Hỏi trợ lý AI PhoneShop (grounding catalog+FAQ, multi-provider)' })
  ask(@Body() dto: AskChatbotDto, @CurrentUser() user: any) {
    return this.chatbotService.ask(dto, user || null);
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Gợi ý câu hỏi nhanh cho widget AI' })
  suggestions() {
    return { suggestions: this.chatbotService.getSuggestions() };
  }

  @Throttle(CHAT_THROTTLE)
  @Sse('stream')
  @UseGuards(OptionalJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Chat streaming SSE (token → products → done)' })
  stream(
    @Query('message') message: string,
    @Query('conversationId') conversationId: string | undefined,
    @CurrentUser() user: any,
  ): Observable<{ data: StreamEvent }> {
    return new Observable((sub) => {
      let alive = true;
      void (async () => {
        try {
          const msg = String(message || '').slice(0, 1000);
          if (!msg.trim()) throw new Error('Empty message');
          await this.chatbotService.streamAsk(
            { message: msg, history: [], conversationId } as any,
            user || null,
            (e) => {
              if (alive) sub.next({ data: e });
            },
          );
        } catch {
          if (alive) {
            sub.next({ data: { type: 'token', text: 'Tôi đang hơi bận một chút. Bạn thử lại sau nhé.' } });
            sub.next({ data: { type: 'done' } });
          }
        } finally {
          if (alive) sub.complete();
        }
      })();
      return () => {
        alive = false;
      };
    });
  }
}
