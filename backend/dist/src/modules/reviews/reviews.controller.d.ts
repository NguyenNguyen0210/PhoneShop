import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';
import { ReviewStatus } from '@prisma/client';
export declare class ReviewsController {
    private readonly reviewsService;
    constructor(reviewsService: ReviewsService);
    findAll(productId?: string): Promise<({
        user: {
            id: string;
            firstName: string | null;
            lastName: string | null;
            avatarUrl: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.ReviewStatus;
        updatedAt: Date;
        userId: string;
        productId: string;
        title: string | null;
        rating: number;
        content: string | null;
        isVerified: boolean;
    })[]>;
    findOne(id: string): Promise<{
        user: {
            id: string;
            firstName: string | null;
            lastName: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.ReviewStatus;
        updatedAt: Date;
        userId: string;
        productId: string;
        title: string | null;
        rating: number;
        content: string | null;
        isVerified: boolean;
    }>;
    create(user: any, dto: CreateReviewDto): Promise<{
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.ReviewStatus;
        updatedAt: Date;
        userId: string;
        productId: string;
        title: string | null;
        rating: number;
        content: string | null;
        isVerified: boolean;
    }>;
    update(user: any, id: string, dto: UpdateReviewDto): Promise<{
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.ReviewStatus;
        updatedAt: Date;
        userId: string;
        productId: string;
        title: string | null;
        rating: number;
        content: string | null;
        isVerified: boolean;
    }>;
    remove(user: any, id: string): Promise<{
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.ReviewStatus;
        updatedAt: Date;
        userId: string;
        productId: string;
        title: string | null;
        rating: number;
        content: string | null;
        isVerified: boolean;
    }>;
    findAllAdmin(productId?: string, status?: ReviewStatus): Promise<({
        user: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
        };
        product: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.ReviewStatus;
        updatedAt: Date;
        userId: string;
        productId: string;
        title: string | null;
        rating: number;
        content: string | null;
        isVerified: boolean;
    })[]>;
    approve(id: string): Promise<{
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.ReviewStatus;
        updatedAt: Date;
        userId: string;
        productId: string;
        title: string | null;
        rating: number;
        content: string | null;
        isVerified: boolean;
    }>;
    reject(id: string): Promise<{
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.ReviewStatus;
        updatedAt: Date;
        userId: string;
        productId: string;
        title: string | null;
        rating: number;
        content: string | null;
        isVerified: boolean;
    }>;
    verify(id: string): Promise<{
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.ReviewStatus;
        updatedAt: Date;
        userId: string;
        productId: string;
        title: string | null;
        rating: number;
        content: string | null;
        isVerified: boolean;
    }>;
}
