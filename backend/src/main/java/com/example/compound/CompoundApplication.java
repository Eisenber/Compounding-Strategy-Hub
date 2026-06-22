package com.example.compound;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class CompoundApplication {

    public static void main(String[] args) {
        SpringApplication.run(CompoundApplication.class, args);
    }
}
