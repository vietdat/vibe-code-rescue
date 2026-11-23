package com.example.demo;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

// DEMO ONLY — intentionally vulnerable.
@RestController
public class UserController {

    private final JdbcTemplate jdbcTemplate;

    public UserController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/api/users")
    public List<Map<String, Object>> getUser(@RequestParam String id) {
        // SQL built by string concatenation — SQL injection risk.
        String sql = "SELECT * FROM users WHERE id = '" + id + "'";
        return jdbcTemplate.queryForList(sql);
    }
}
