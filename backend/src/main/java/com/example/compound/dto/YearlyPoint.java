package com.example.compound.dto;

public class YearlyPoint {

    private int year;
    private double amount;

    public YearlyPoint() {}

    public YearlyPoint(int year, double amount) {
        this.year = year;
        this.amount = amount;
    }

    public int getYear() { return year; }
    public void setYear(int year) { this.year = year; }

    public double getAmount() { return amount; }
    public void setAmount(double amount) { this.amount = amount; }
}
