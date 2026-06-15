import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { Cream, Ink, Bordeaux, Line, FontFamily, FontSize, Space, Radius } from '@/constants/theme'

export default function LoginScreen() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function handleLogin() {
    if (!email || !password) {
      setError('Remplis les deux champs.')
      return
    }
    setLoading(true)
    setError(null)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (authError) {
      setError('Email ou mot de passe incorrect.')
    } else {
      router.replace('/(tabs)')
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        {/* Logo */}
        <Text style={styles.logo}>Zest<Text style={styles.logoSup}>up</Text></Text>

        {/* Email */}
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Ink.faint}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
        />

        {/* Password */}
        <View style={styles.pwdWrapper}>
          <TextInput
            style={[styles.input, { flex: 1, borderWidth: 0, paddingRight: Space.s7 }]}
            placeholder="Mot de passe"
            placeholderTextColor={Ink.faint}
            secureTextEntry={!showPwd}
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPwd(v => !v)}>
            <Text style={styles.eyeIcon}>{showPwd ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        </View>

        {/* Erreur */}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* CTA */}
        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color={Cream.default} />
            : <Text style={styles.btnText}>Se connecter →</Text>
          }
        </TouchableOpacity>

        {/* Mention bas */}
        <Text style={styles.footer}>Accès réservé aux membres ZESTUP</Text>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Cream.default,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Space.s6,
    gap: Space.s4,
  },
  logo: {
    fontFamily: FontFamily.serif,
    fontSize: 42,
    color: Ink.default,
    textAlign: 'center',
    marginBottom: Space.s5,
    letterSpacing: -1,
  },
  logoSup: {
    fontSize: 28,
    color: Bordeaux.default,
  },
  input: {
    backgroundColor: Cream.paper ?? '#FBF8F2',
    borderWidth: 1,
    borderColor: Line.default,
    borderRadius: Radius.md,
    paddingHorizontal: Space.s4,
    paddingVertical: Space.s3,
    fontSize: FontSize.body,
    fontFamily: FontFamily.sans,
    color: Ink.default,
  },
  pwdWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Cream.paper ?? '#FBF8F2',
    borderWidth: 1,
    borderColor: Line.default,
    borderRadius: Radius.md,
    paddingHorizontal: Space.s4,
  },
  eyeBtn: {
    padding: Space.s2,
  },
  eyeIcon: {
    fontSize: 16,
  },
  errorText: {
    color: Bordeaux.default,
    fontFamily: FontFamily.sans,
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  btn: {
    backgroundColor: Bordeaux.default,
    borderRadius: Radius.pill,
    paddingVertical: Space.s4,
    alignItems: 'center',
    marginTop: Space.s2,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: Cream.default,
    fontFamily: FontFamily.sansSemibold,
    fontSize: FontSize.body,
    letterSpacing: 0.2,
  },
  footer: {
    color: Ink.faint,
    fontFamily: FontFamily.sans,
    fontSize: FontSize.xs,
    textAlign: 'center',
    marginTop: Space.s5,
  },
})
