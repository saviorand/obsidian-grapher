import unittest
from utils import parse_prolog_predicates  

class TestParsePrologPredicates(unittest.TestCase):

    def test_empty_input(self):
        content = ""
        arity_1, arity_2 = parse_prolog_predicates(content)
        self.assertEqual(arity_1, {})
        self.assertEqual(arity_2, [])

    def test_arity_1_quoted(self):
        content = "predicate('arg')."
        arity_1, arity_2 = parse_prolog_predicates(content)
        self.assertEqual(arity_1, {'predicate': {'arg'}})
        self.assertEqual(arity_2, [])

    def test_arity_1_unquoted(self):
        content = "predicate(arg)."
        arity_1, arity_2 = parse_prolog_predicates(content)
        self.assertEqual(arity_1, {'predicate': {'arg'}})
        self.assertEqual(arity_2, [])

    def test_arity_2_quoted(self):
        content = "predicate('arg1', 'arg2')."
        arity_1, arity_2 = parse_prolog_predicates(content)
        self.assertEqual(arity_1, {})
        self.assertEqual(arity_2, [('predicate', 'arg1', 'arg2')])

    def test_arity_2_unquoted(self):
        content = "predicate(arg1, arg2)."
        arity_1, arity_2 = parse_prolog_predicates(content)
        self.assertEqual(arity_1, {})
        self.assertEqual(arity_2, [('predicate', 'arg1', 'arg2')])

    def test_arity_2_mixed_quotes(self):
        content = "predicate('arg1', arg2)."
        arity_1, arity_2 = parse_prolog_predicates(content)
        self.assertEqual(arity_1, {})
        self.assertEqual(arity_2, [('predicate', 'arg1', 'arg2')])

    def test_multiple_predicates(self):
        content = """
        pred1('arg1').
        pred2(arg2).
        pred3('arg3', 'arg4').
        pred4(arg5, arg6).
        pred1('arg7').
        """
        arity_1, arity_2 = parse_prolog_predicates(content)
        self.assertEqual(arity_1, {'pred1': {'arg1', 'arg7'}, 'pred2': {'arg2'}})
        self.assertEqual(arity_2, [('pred3', 'arg3', 'arg4'), ('pred4', 'arg5', 'arg6')])

    def test_whitespace_handling(self):
        content = """
        pred1  (  'arg1'  )  .
        pred2('arg2'   ,    'arg3')   .
        """
        arity_1, arity_2 = parse_prolog_predicates(content)
        self.assertEqual(arity_1, {'pred1': {'arg1'}})
        self.assertEqual(arity_2, [('pred2', 'arg2', 'arg3')])

    def test_special_characters(self):
        content = """
        pred1('arg-with-hyphens').
        pred2('arg_with_underscores', 'arg.with.dots').
        """
        arity_1, arity_2 = parse_prolog_predicates(content)
        self.assertEqual(arity_1, {'pred1': {'arg-with-hyphens'}})
        self.assertEqual(arity_2, [('pred2', 'arg_with_underscores', 'arg.with.dots')])

if __name__ == '__main__':
    unittest.main()
