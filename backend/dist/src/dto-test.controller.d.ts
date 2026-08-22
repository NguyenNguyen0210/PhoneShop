import { TestValidationDto } from './dto/test-validation.dto';
export declare class DtoTestController {
    testValidation(body: TestValidationDto): {
        message: string;
        data: TestValidationDto;
    };
}
