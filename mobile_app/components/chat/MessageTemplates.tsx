import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface Template {
  id: string;
  title: string;
  titlePt: string;
  body: string;
  bodyPt: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'payment_reminder',
    title: 'Payment Reminder',
    titlePt: 'Lembrete de Pagamento',
    body: 'Dear {name}, we remind you of a pending payment. Please contact us to settle.',
    bodyPt: 'Prezado(a) {name},\n\nLembramos que existe um pagamento pendente na nossa empresa.\n\nPor favor, entre em contacto connosco para regularizar a situação.\n\nObrigado pela atenção.',
  },
  {
    id: 'invoice_sent',
    title: 'Invoice Sent',
    titlePt: 'Factura Enviada',
    body: 'Dear {name}, we have sent invoice {ref}. Please find it attached.',
    bodyPt: 'Prezado(a) {name},\n\nEnviamos em anexo a factura {ref} para a sua apreciação.\n\nQualquer questão, estamos à disposição.\n\nObrigado.',
  },
  {
    id: 'payment_confirm',
    title: 'Payment Confirmed',
    titlePt: 'Pagamento Confirmado',
    body: 'Dear {name}, we confirm receipt of your payment. Thank you.',
    bodyPt: 'Prezado(a) {name},\n\nConfirmamos a recepção do seu pagamento. Muito obrigado pela pontualidade.\n\nAtenciosamente.',
  },
  {
    id: 'quote_sent',
    title: 'Quote for Approval',
    titlePt: 'Cotação para Aprovação',
    body: 'Dear {name}, please find attached quote {ref} for your approval.',
    bodyPt: 'Prezado(a) {name},\n\nEnviamos em anexo a cotação {ref} para a sua aprovação.\n\nAguardamos o seu feedback.\n\nObrigado.',
  },
];

interface MessageTemplatesProps {
  visible: boolean;
  clientName: string;
  docRef?: string;
  lang: 'pt' | 'en';
  onSend: (message: string) => void;
  onClose: () => void;
}

export function MessageTemplates({ visible, clientName, docRef = '', lang, onSend, onClose }: MessageTemplatesProps) {
  const [selected, setSelected] = useState<Template | null>(null);
  const [editedText, setEditedText] = useState('');

  const selectTemplate = (t: Template) => {
    setSelected(t);
    const raw = lang === 'pt' ? t.bodyPt : t.body;
    setEditedText(raw.replace('{name}', clientName).replace('{ref}', docRef));
  };

  const reset = () => { setSelected(null); setEditedText(''); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="bg-white dark:bg-gray-900 rounded-t-3xl pt-2 pb-8 px-4 max-h-[80%]">
          <View className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4" />
          <Text className="text-lg font-montserrat text-gray-900 dark:text-white mb-4">
            {selected ? 'Editar Mensagem' : 'Modelos de Mensagem'}
          </Text>

          {!selected ? (
            <ScrollView>
              {TEMPLATES.map(t => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => selectTemplate(t)}
                  className="flex-row items-center gap-3 py-4 border-b border-gray-100 dark:border-gray-700"
                >
                  <View className="w-10 h-10 bg-primary-50 dark:bg-primary-900 rounded-xl items-center justify-center">
                    <Feather name="message-circle" size={18} color="#0c1c48" />
                  </View>
                  <Text className="font-inter-medium text-gray-800 dark:text-gray-100">
                    {lang === 'pt' ? t.titlePt : t.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View className="flex-1">
              <TextInput
                value={editedText}
                onChangeText={setEditedText}
                multiline
                className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 font-inter text-gray-800 dark:text-gray-100 text-sm flex-1 min-h-[150px] border border-gray-200 dark:border-gray-600"
                textAlignVertical="top"
              />
              <View className="flex-row gap-2 mt-4">
                <TouchableOpacity onPress={reset} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 items-center">
                  <Text className="font-inter-bold text-gray-600 dark:text-gray-300">Voltar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { onSend(editedText); reset(); onClose(); }}
                  className="flex-1 py-3 rounded-xl bg-primary-950 items-center"
                >
                  <Text className="font-inter-bold text-white">Enviar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity onPress={onClose} className="mt-3 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 items-center">
            <Text className="font-inter-bold text-gray-600 dark:text-gray-300">Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
