package com.fbi.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI transactionMonitoringOpenApi() {
        return new OpenAPI().info(new Info()
            .title("Transaction Monitoring API")
            .description("REST API for transaction ingestion, rule management, and alert lifecycle")
            .version("v1")
            .contact(new Contact().name("Training Team")));
    }
}

