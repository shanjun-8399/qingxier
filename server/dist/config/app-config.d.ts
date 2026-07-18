export declare class AppConfig {
    readonly appEnv: string;
    readonly port: number;
    readonly authMode: string;
    readonly jwtSecret: string;
    readonly jwtIssuer: string;
    readonly storageBackend: string;
    readonly mongoUri: string;
    readonly eventBackend: string;
    readonly mqttUrl: string;
    readonly providerMode: string;
    readonly dashscopeApiKey: string;
    readonly dashscopeBaseUrl: string;
    readonly cloneTtsModel: string;
    readonly systemTtsModel: string;
    readonly llmBaseUrl: string;
    readonly llmApiKey: string;
    readonly llmModel: string;
    readonly cosBaseUrl: string;
    validate(): void;
}
