package com.example.compound.service;

import com.example.compound.dto.CompareRequest;
import com.example.compound.dto.CompareResponse;

public interface CompoundService {

    /**
     * 对多个复利投资方案进行横向对比计算
     *
     * @param request 包含 2-5 个方案输入
     * @return 各方案结果、最优方案和整体结论
     */
    CompareResponse compare(CompareRequest request);
}
