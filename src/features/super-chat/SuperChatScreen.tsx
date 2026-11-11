import { StatusBar } from 'expo-status-bar';
import { type ComponentRef, useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, type KeyboardEvent, LayoutAnimation, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useReducedMotion } from '@/hooks/useReducedMotion';

import { ChatHeader, PropertyCard } from './components/ChatHeader';
import { Composer } from './components/Composer';
import { SuperTurnView } from './components/SuperTurnView';
import { UserMessageView } from './components/UserMessageView';
import { pickPhoto } from './pickPhoto';
import { colors } from './theme';
import { useConversation } from './useConversation';
import { useVoiceInput } from './useVoiceInput';

/**
 * Rentesy "Super" maintenance chat. One screen: the landlord can type, speak,
 * or attach a photo, and Super answers with a scripted, animated reply.
 */
export function SuperChatScreen() {
  const reducedMotion = useReducedMotion();
  const animate = !reducedMotion;
  const { items, busy, send, restart } = useConversation({ instant: reducedMotion });
  const [notice, setNotice] = useState<{ id: number; message: string } | null>(null);
  const keyboardOpen = useKeyboardOpen(animate);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);

  const showNotice = useCallback((message: string) => setNotice({ id: Date.now(), message }), []);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(id);
  }, [notice]);

  const voice = useVoiceInput({
    onFinal: (text, { sample }) => send({ kind: 'voice', text, sample }),
    onError: showNotice,
  });

  const attachPhoto = async () => {
    try {
      const photo = await pickPhoto();
      if (photo) send({ kind: 'photo', ...photo });
    } catch {
      showNotice('Couldn’t open your photos. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.fill} behavior="padding">
      <SafeAreaView style={styles.safe} edges={keyboardOpen ? ['top'] : ['top', 'bottom']}>
        <StatusBar style="dark" />
        <View style={styles.phone}>
          <ChatHeader busy={busy} animate={animate} showProperty={keyboardOpen} onRestart={restart} />
          {/* Collapses while typing so the conversation keeps its room; the header shows the property instead. */}
          {!keyboardOpen && <PropertyCard />}

          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.messages}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: animate })}
          >
            {items.map((item, index) =>
              item.from === 'user'
                ? // Read once Super has picked it up (its thinking bubble appears after this message).
                  <UserMessageView key={item.id} message={item} read={items.slice(index + 1).some((later) => later.from === 'super')} animate={animate} />
                : <SuperTurnView key={item.id} turn={item} animate={animate} />,
            )}
          </ScrollView>

          <View>
            <Composer
              inputRef={inputRef}
              busy={busy}
              animate={animate}
              voice={voice}
              onSendText={(text) => send({ kind: 'text', text })}
              onAttach={attachPhoto}
              onViewRequest={() => send({ kind: 'view-request' })}
              notice={notice}
            />
          </View>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

/**
 * True while the software keyboard is up. Layout changes that follow (property card collapsing,
 * bottom safe-area inset dropping) ride along with the keyboard's own animation.
 */
function useKeyboardOpen(animate: boolean) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const update = (next: boolean) => (event: KeyboardEvent) => {
      if (animate) {
        const type = Platform.OS === 'ios' ? LayoutAnimation.Types.keyboard : LayoutAnimation.Types.easeInEaseOut;
        LayoutAnimation.configureNext({
          duration: event.duration || 250,
          create: { type, property: LayoutAnimation.Properties.opacity },
          update: { type },
          delete: { type, property: LayoutAnimation.Properties.opacity },
        });
      }
      setOpen(next);
    };
    const subs = [Keyboard.addListener(showEvent, update(true)), Keyboard.addListener(hideEvent, update(false))];
    return () => subs.forEach((s) => s.remove());
  }, [animate]);
  return open;
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.canvas },
  safe: { flex: 1, backgroundColor: colors.canvas, justifyContent: 'center', alignItems: 'center' },
  phone: { width: '100%', maxWidth: 430, flex: 1, maxHeight: 900, backgroundColor: colors.canvas },
  messages: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 14, flexGrow: 1 },
});
