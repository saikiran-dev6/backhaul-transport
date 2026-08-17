import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { login, verifyOtp } from "../api";

export function AuthScreen({
  onAuthSuccess,
}: {
  onAuthSuccess: (session: { token: string; sessionRole?: string }) => void;
}) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"LOGIN" | "OTP">("LOGIN");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!identifier || !password) {
      setError("Please fill in both identifier and password");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await login(identifier, password);
      if (res.token) {
        onAuthSuccess({ token: res.token });
      } else {
        setStep("OTP");
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      setError("Please enter the OTP");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await verifyOtp(identifier, otp);
      onAuthSuccess({ token: res.token, sessionRole: res.sessionRole });
    } catch (err: any) {
      setError(err.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Backhaul Mobile</Text>
      <Text style={styles.subtitle}>
        {step === "LOGIN" ? "Sign in to your account" : "Enter OTP verification code"}
      </Text>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {step === "LOGIN" ? (
        <>
          <Text style={styles.label}>Email or Phone</Text>
          <TextInput
            style={styles.input}
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="e.g. user@backhaul.com"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
          />

          <Pressable style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Sign In</Text>}
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.label}>OTP Code (Test: 123456)</Text>
          <TextInput
            style={styles.input}
            value={otp}
            onChangeText={setOtp}
            placeholder="123456"
            keyboardType="number-pad"
          />

          <Pressable style={styles.button} onPress={handleVerifyOtp} disabled={loading}>
            {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Verify OTP</Text>}
          </Pressable>

          <Pressable style={styles.linkButton} onPress={() => setStep("LOGIN")}>
            <Text style={styles.linkText}>Back to Sign In</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", backgroundColor: "#f8fafc" },
  title: { fontSize: 28, fontWeight: "900", color: "#0f172a", marginBottom: 4 },
  subtitle: { fontSize: 16, color: "#64748b", marginBottom: 24 },
  label: { fontSize: 14, fontWeight: "700", color: "#334155", marginBottom: 6 },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#ffffff", fontWeight: "800", fontSize: 16 },
  errorText: { color: "#dc2626", marginBottom: 12, fontWeight: "600" },
  linkButton: { marginTop: 16, alignItems: "center" },
  linkText: { color: "#2563eb", fontWeight: "700" },
});
