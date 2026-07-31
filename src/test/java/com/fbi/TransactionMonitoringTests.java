package com.fbi;

import com.fbi.model.AlertStatus;
import com.fbi.model.Alert;
import com.fbi.repository.AlertRepository;
import com.fbi.repository.MonitoredTransactionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class TransactionMonitoringTests {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Autowired
	private MonitoredTransactionRepository transactionRepository;

	@Autowired
	private AlertRepository alertRepository;

	@BeforeEach
	void setup() {
		alertRepository.deleteAll();
		transactionRepository.deleteAll();
	}

	@Test
	void createsAlertsWhenRulesTrigger() throws Exception {
		String request = """
			{
			  "accountId":"ACC-001",
			  "payeeId":"PAYEE-NEW",
			  "amount":15000,
			  "currency":"USD",
			  "description":"high value test"
			}
			""";

		mockMvc.perform(post("/api/transactions")
				.contentType(MediaType.APPLICATION_JSON)
				.content(request))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.accountId").value("ACC-001"));

		mockMvc.perform(get("/api/alerts"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].status").value("OPEN"));

		assertThat(alertRepository.findAll()).isNotEmpty();
	}

	@Test
	void enforcesAlertLifecycleTransitions() throws Exception {
		createTransaction("ACC-002", "PAYEE-X", 15000, null, "lifecycle test");

		Alert alert = alertRepository.findAll().stream()
			.filter(a -> a.getStatus() == AlertStatus.OPEN)
			.findFirst()
			.orElseThrow();

		String invalidUpdate = objectMapper.writeValueAsString(new StatusUpdate("CLOSED", "skip steps"));
		mockMvc.perform(patch("/api/alerts/{id}/status", alert.getId())
				.contentType(MediaType.APPLICATION_JSON)
				.content(invalidUpdate))
			.andExpect(status().isBadRequest());

		mockMvc.perform(patch("/api/alerts/{id}/status", alert.getId())
				.contentType(MediaType.APPLICATION_JSON)
				.content(objectMapper.writeValueAsString(new StatusUpdate("ACKNOWLEDGED", "seen"))))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("ACKNOWLEDGED"));

		mockMvc.perform(patch("/api/alerts/{id}/status", alert.getId())
				.contentType(MediaType.APPLICATION_JSON)
				.content(objectMapper.writeValueAsString(new StatusUpdate("INVESTIGATING", "working"))))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("INVESTIGATING"));

		mockMvc.perform(patch("/api/alerts/{id}/status", alert.getId())
				.contentType(MediaType.APPLICATION_JSON)
				.content(objectMapper.writeValueAsString(new StatusUpdate("CLOSED", "resolved"))))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("CLOSED"));
	}

	@Test
	void filtersTransactionsByAccountAmountAndTimeRange() throws Exception {
		createTransaction("ACC-F1", "PAYEE-A", 100, "2026-07-31T10:00:00Z", "small");
		createTransaction("ACC-F1", "PAYEE-B", 500, "2026-07-31T10:05:00Z", "mid");
		createTransaction("ACC-F2", "PAYEE-C", 900, "2026-07-31T10:10:00Z", "other account");

		mockMvc.perform(get("/api/transactions")
				.param("accountId", "ACC-F1")
				.param("minAmount", "200")
				.param("maxAmount", "600")
				.param("from", "2026-07-31T10:00:00Z")
				.param("to", "2026-07-31T10:06:00Z"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(1))
			.andExpect(jsonPath("$[0].accountId").value("ACC-F1"))
			.andExpect(jsonPath("$[0].amount").value(500));
	}

	@Test
	void filtersAlertsAndReturnsNotFoundForMissingAlert() throws Exception {
		createTransaction("ACC-HIGH", "PAYEE-1", 15000, null, "high");

		mockMvc.perform(get("/api/alerts")
				.param("status", "OPEN")
				.param("severity", "HIGH"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(Matchers.greaterThan(0)))
			.andExpect(jsonPath("$[0].severity").value("HIGH"));

		mockMvc.perform(get("/api/alerts/{id}", 999999))
			.andExpect(status().isNotFound());
	}

	@Test
	void validatesRuleRequestByType() throws Exception {
		String invalidVelocityRule = """
			{
			  "name":"Velocity Missing Params",
			  "type":"VELOCITY",
			  "severity":"MEDIUM",
			  "active":true
			}
			""";

		mockMvc.perform(post("/api/rules")
				.contentType(MediaType.APPLICATION_JSON)
				.content(invalidVelocityRule))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.message").value(Matchers.containsString("velocityCount")));
	}

	@Test
	void supportsDismissAndBlocksFurtherChangesFromDismissed() throws Exception {
		createTransaction("ACC-D1", "PAYEE-D", 15000, null, "dismiss flow");
		Alert alert = alertRepository.findAll().stream()
			.filter(a -> a.getStatus() == AlertStatus.OPEN)
			.findFirst()
			.orElseThrow();

		mockMvc.perform(patch("/api/alerts/{id}/status", alert.getId())
				.contentType(MediaType.APPLICATION_JSON)
				.content(objectMapper.writeValueAsString(new StatusUpdate("DISMISSED", "false positive"))))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("DISMISSED"));

		mockMvc.perform(patch("/api/alerts/{id}/status", alert.getId())
				.contentType(MediaType.APPLICATION_JSON)
				.content(objectMapper.writeValueAsString(new StatusUpdate("ACKNOWLEDGED", "should fail"))))
			.andExpect(status().isBadRequest());
	}

	private void createTransaction(String accountId, String payeeId, int amount, String occurredAt, String description) throws Exception {
		String request;
		if (occurredAt == null) {
			request = """
				{
				  "accountId":"%s",
				  "payeeId":"%s",
				  "amount":%d,
				  "currency":"USD",
				  "description":"%s"
				}
				""".formatted(accountId, payeeId, amount, description);
		} else {
			request = """
				{
				  "accountId":"%s",
				  "payeeId":"%s",
				  "amount":%d,
				  "currency":"USD",
				  "occurredAt":"%s",
				  "description":"%s"
				}
				""".formatted(accountId, payeeId, amount, occurredAt, description);
		}

		mockMvc.perform(post("/api/transactions")
				.contentType(MediaType.APPLICATION_JSON)
				.content(request))
			.andExpect(status().isOk());
	}

	private record StatusUpdate(String status, String note) {
	}

}
